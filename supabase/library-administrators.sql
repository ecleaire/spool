-- Shared-library scoped administrators. Apply after member-permissions.sql.
begin;
alter table public.library_members add column if not exists is_library_admin boolean not null default false;
create or replace function public.spool_library_admin(lib uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_member(lib) and (public.spool_owner(lib) or exists(select 1 from public.library_members m join public.libraries l on l.id=m.library_id where m.library_id=lib and m.user_id=auth.uid() and m.is_library_admin and not l.personal));
$$;
create or replace function public.spool_has_permission(lib uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select cap=any(public.spool_permission_keys()) and public.spool_member(lib) and (public.spool_library_admin(lib) or exists(select 1 from public.library_members m where m.library_id=lib and m.user_id=auth.uid() and m.role='editor' and (m.permissions is null or coalesce((m.permissions->>cap)::boolean,false))));
$$;
create or replace function public.get_my_library_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 return (select jsonb_object_agg(cap,public.spool_has_permission(lib,cap)) from unnest(public.spool_permission_keys()) cap)||jsonb_build_object('_admin',public.spool_library_admin(lib));
end;
$$;
create or replace function public.get_library_member_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_library_admin(lib) or not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library administrator required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'role',role,'permissions',permissions,'is_library_admin',is_library_admin or role='owner')) from public.library_members where library_id=lib),'[]'::jsonb);
end;
$$;
create or replace function public.set_library_member_access(lib uuid,target_user uuid,member_role text,grants jsonb,administrator boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Serialize administrative changes, then recheck the caller's current membership.
 perform 1 from public.libraries where id=lib for update;
 if not public.spool_library_admin(lib) or not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library administrator required' using errcode='42501';end if;
 if exists(select 1 from public.libraries where id=lib and owner_id=target_user) or exists(select 1 from public.library_members where library_id=lib and user_id=target_user and role='owner') then raise exception 'Host permissions cannot be changed' using errcode='42501';end if;
 if administrator is null or member_role is null or member_role not in ('viewer','editor') then raise exception 'Invalid member role' using errcode='22023';end if;
 if grants is not null then
  if jsonb_typeof(grants)<>'object' then raise exception 'Invalid permission settings' using errcode='22023';end if;
  if exists(select 1 from jsonb_each(grants) where not(key=any(public.spool_permission_keys())) or jsonb_typeof(value)<>'boolean') then raise exception 'Invalid permission settings' using errcode='22023';end if;
 end if;
 perform 1 from public.library_members where library_id=lib and user_id=target_user for update;
 if not found then raise exception 'Member not found' using errcode='22023';end if;
 update public.library_members set role=case when administrator then 'editor' else member_role end,permissions=case when administrator or member_role='viewer' then null else grants end,is_library_admin=administrator where library_id=lib and user_id=target_user;
end;
$$;
create or replace function public.set_library_member_permissions(lib uuid,target_user uuid,member_role text,grants jsonb default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.set_library_member_access(lib,target_user,member_role,grants,false);
end;
$$;
create or replace function public.invite_library_member(lib uuid,target_email text,member_role text default 'editor') returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for update;
 if not public.spool_library_admin(lib) then raise exception 'Library administrator required' using errcode='42501';end if;
 target_email:=lower(trim(target_email));
 if target_email is null or length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or member_role is null or member_role not in ('editor','viewer') then raise exception 'Invalid invitation';end if;
 insert into public.spool_users values(target_email) on conflict do nothing;
 insert into public.library_invitations values(lib,target_email,member_role) on conflict(library_id,email) do update set role=excluded.role;
end;
$$;
create or replace function public.remove_library_member(lib uuid,target_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for update;
 if not public.spool_library_admin(lib) then raise exception 'Library administrator required' using errcode='42501';end if;
 if exists(select 1 from public.libraries where id=lib and owner_id=target_user) then raise exception 'Host cannot be removed' using errcode='42501';end if;
 delete from public.library_members where library_id=lib and user_id=target_user and role<>'owner';
end;
$$;
drop policy if exists invitation_read on public.library_invitations;
create policy invitation_read on public.library_invitations for select to authenticated using(public.spool_library_admin(library_id));
drop policy if exists invitation_cancel on public.library_invitations;
create policy invitation_cancel on public.library_invitations for delete to authenticated using(public.spool_library_admin(library_id));
create or replace function public.update_library_appearance(lib uuid,library_name text,library_color text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.libraries l where l.id=lib and (public.spool_library_admin(lib) or (not l.personal and public.spool_member(lib) and public.spool_is_admin()))) then raise exception 'Library owner or participating administrator required' using errcode='42501';end if;
 if library_name is null or length(trim(library_name))<1 or length(trim(library_name))>80 then raise exception 'Invalid library name' using errcode='22023';end if;
 if library_color is null or library_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Invalid library color' using errcode='22023';end if;
 update public.libraries set name=trim(library_name),color=upper(library_color) where id=lib;
end;
$$;
create or replace function public.get_library_member_profiles(lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'is_library_admin',m.is_library_admin or m.role='owner',
 'display_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'spool_display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'メンバー'),50),
 'display_id',case when u.raw_user_meta_data->>'spool_handle' ~ '^[a-z0-9_]{3,30}$' then u.raw_user_meta_data->>'spool_handle' else '' end))
 from public.library_members m join auth.users u on u.id=m.user_id where m.library_id=lib),'[]'::jsonb);
end;
$$;

revoke execute on function public.spool_library_admin(uuid),public.set_library_member_access(uuid,uuid,text,jsonb,boolean) from public,anon;
grant execute on function public.spool_library_admin(uuid),public.set_library_member_access(uuid,uuid,text,jsonb,boolean) to authenticated;
commit;
