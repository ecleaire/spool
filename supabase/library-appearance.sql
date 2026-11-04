-- Personal appearance is private-owner managed; shared appearance allows member admins too.
begin;
alter table public.libraries add column if not exists color text not null default '#2F6F56' check(color ~ '^#[0-9A-Fa-f]{6}$');
create or replace function public.update_library_appearance(lib uuid,library_name text,library_color text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.libraries l where l.id=lib and (public.spool_owner(lib) or (not l.personal and public.spool_member(lib) and public.spool_is_admin()))) then raise exception 'Library owner or participating administrator required' using errcode='42501';end if;
 if library_name is null or length(trim(library_name))<1 or length(trim(library_name))>80 then raise exception 'Invalid library name' using errcode='22023';end if;
 if library_color is null or library_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Invalid library color' using errcode='22023';end if;
 update public.libraries set name=trim(library_name),color=upper(library_color) where id=lib;
end;
$$;
create or replace function public.rename_spool_library(lib uuid,library_name text) returns void
language plpgsql security definer set search_path='' as $$
declare saved_color text;
begin
 select color into saved_color from public.libraries where id=lib;
 perform public.update_library_appearance(lib,library_name,saved_color);
end;
$$;
revoke execute on function public.update_library_appearance(uuid,text,text) from public,anon;
grant execute on function public.update_library_appearance(uuid,text,text) to authenticated;
create or replace function public.get_library_member_profiles(lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,
 'display_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'spool_display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'メンバー'),50),
 'display_id',case when u.raw_user_meta_data->>'spool_handle' ~ '^[a-z0-9_]{3,30}$' then u.raw_user_meta_data->>'spool_handle' else '' end))
 from public.library_members m join auth.users u on u.id=m.user_id where m.library_id=lib),'[]'::jsonb);
end;
$$;
revoke execute on function public.get_library_member_profiles(uuid) from public,anon;
grant execute on function public.get_library_member_profiles(uuid) to authenticated;
commit;
