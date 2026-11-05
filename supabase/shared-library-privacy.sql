-- Restrict shared-library member identities to its host and administrators.
begin;
create or replace function public.get_library_member_profiles(lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) or (exists(select 1 from public.libraries where id=lib and not personal) and not public.spool_library_admin(lib)) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'is_library_admin',m.is_library_admin or m.role='owner',
 'display_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'spool_display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'メンバー'),50),
 'display_id',case when u.raw_user_meta_data->>'spool_handle' ~ '^[a-z0-9_]{3,30}$' then u.raw_user_meta_data->>'spool_handle' else '' end))
 from public.library_members m join auth.users u on u.id=m.user_id where m.library_id=lib),'[]'::jsonb);
end;
$$;

drop policy if exists member_read on public.library_members;
create policy member_read on public.library_members for select to authenticated using(user_id=auth.uid() or public.spool_library_admin(library_id));
commit;
notify pgrst, 'reload schema';
