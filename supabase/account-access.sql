-- Per-account service limits. Existing accounts retain their current access.
begin;
create table if not exists public.spool_account_limits (
 email text primary key references public.spool_users(email) on delete cascade,
 mode text not null default 'standard' check(mode in ('standard','shared_only','disabled')),
 features jsonb not null default '{}'
);
alter table public.spool_account_limits enable row level security;
revoke all on public.spool_account_limits from public,anon,authenticated;
create or replace function public.spool_account_feature_keys() returns text[] language sql immutable set search_path='' as $$
 select public.spool_permission_keys()||array['create_shared','manage_members','delete_shared'];
$$;
create or replace function public.spool_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'provider','')='google'
 and exists(select 1 from public.spool_users u left join public.spool_account_limits a on a.email=u.email where u.email=lower(auth.jwt()->>'email') and coalesce(a.mode,'standard')<>'disabled');
$$;
create or replace function public.spool_account_feature(cap text) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and cap=any(public.spool_account_feature_keys()) and coalesce((select (features->>cap)::boolean from public.spool_account_limits where email=lower(auth.jwt()->>'email')),true);
$$;
create or replace function public.spool_member(lib uuid,editing boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.library_members m join public.libraries l on l.id=m.library_id where m.library_id=lib and m.user_id=auth.uid() and (not editing or m.role in ('owner','editor')) and (not l.personal or coalesce((select mode from public.spool_account_limits where email=lower(auth.jwt()->>'email')),'standard')='standard'));
$$;
create or replace function public.spool_owner(lib uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.libraries l where l.id=lib and l.owner_id=auth.uid() and (not l.personal or coalesce((select mode from public.spool_account_limits where email=lower(auth.jwt()->>'email')),'standard')='standard'));
$$;
create or replace function public.spool_has_permission(lib uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select cap=any(public.spool_permission_keys()) and public.spool_account_feature(cap) and public.spool_member(lib) and (public.spool_owner(lib) or exists(select 1 from public.library_members m join public.libraries l on l.id=m.library_id where m.library_id=lib and m.user_id=auth.uid() and ((m.is_library_admin and not l.personal) or (m.role='editor' and (m.permissions is null or coalesce((m.permissions->>cap)::boolean,false))))));
$$;
create or replace function public.spool_library_admin(lib uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_account_feature('manage_members') and public.spool_member(lib) and (public.spool_owner(lib) or exists(select 1 from public.library_members m join public.libraries l on l.id=m.library_id where m.library_id=lib and m.user_id=auth.uid() and m.is_library_admin and not l.personal));
$$;
create or replace function public.get_my_library_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 return (select jsonb_object_agg(cap,public.spool_has_permission(lib,cap)) from unnest(public.spool_permission_keys()) cap)||jsonb_build_object('_admin',public.spool_library_admin(lib),'_create_shared',public.spool_account_feature('create_shared'),'_manage_members',public.spool_account_feature('manage_members'),'_delete_shared',public.spool_account_feature('delete_shared'));
end;$$;
create or replace function public.delete_shared_library(lib uuid,confirmation_name text,expected_revision integer,confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.libraries;
begin
 select * into target from public.libraries where id=lib for update;
 if not found or not public.spool_owner(lib) or not public.spool_account_feature('delete_shared') then raise exception 'Host required' using errcode='42501';end if;
 if target.personal then raise exception 'Personal library cannot be deleted' using errcode='22023';end if;
 if confirmed is distinct from true or confirmation_name is distinct from target.name then raise exception 'Two-stage confirmation required' using errcode='22023';end if;
 if (select revision from public.library_state where library_id=lib) is distinct from expected_revision then raise exception 'Library changed; reload before deleting' using errcode='40001';end if;
 if exists(select 1 from storage.objects where bucket_id='spool-models' and left(name,length(lib::text)+1)=lib::text||'/') then raise exception 'Storage files remain; remove using Storage API before deleting' using errcode='55000';end if;
 delete from public.libraries where id=lib;
end;$$;
create or replace function public.ensure_my_library() returns uuid language plpgsql security definer set search_path='' as $$
declare lib uuid;account_mode text;
begin
 if not public.spool_allowed() then raise exception 'SPOOL invitation required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 insert into public.library_members(library_id,user_id,role) select library_id,auth.uid(),role from public.library_invitations where email=lower(auth.jwt()->>'email') on conflict(library_id,user_id) do nothing;
 delete from public.library_invitations where email=lower(auth.jwt()->>'email');
 select mode into account_mode from public.spool_account_limits where email=lower(auth.jwt()->>'email');
 if account_mode='shared_only' then select l.id into lib from public.libraries l join public.library_members m on m.library_id=l.id where not l.personal and m.user_id=auth.uid() order by l.created_at limit 1;return lib;end if;
 select id into lib from public.libraries where owner_id=auth.uid() and personal;
 if lib is null then
  insert into public.libraries(name,owner_id) values('マイライブラリ',auth.uid()) returning id into lib;
  insert into public.library_members(library_id,user_id,role) values(lib,auth.uid(),'owner');
  insert into public.library_state(library_id) values(lib);
 end if;
 return lib;
end;$$;
create or replace function public.get_library_member_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_library_admin(lib) or not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library administrator required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'permissions',m.permissions,'is_library_admin',m.is_library_admin or m.role='owner','service_limits',(select jsonb_object_agg(cap,coalesce(a.mode,'standard')<>'disabled' and coalesce((a.features->>cap)::boolean,true)) from unnest(public.spool_permission_keys()) cap))) from public.library_members m join auth.users u on u.id=m.user_id left join public.spool_account_limits a on a.email=lower(u.email) where m.library_id=lib),'[]'::jsonb);
end;$$;
create or replace function public.create_shared_library(library_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if not public.spool_account_feature('create_shared') then raise exception 'Shared library creation not permitted' using errcode='42501';end if;
 library_name:=trim(coalesce(library_name,''));if length(library_name) not between 1 and 80 then raise exception 'Invalid library name';end if;
 insert into public.libraries(name,owner_id,personal) values(library_name,auth.uid(),false) returning id into new_id;
 insert into public.library_members(library_id,user_id,role) values(new_id,auth.uid(),'owner');insert into public.library_state(library_id) values(new_id);return new_id;
end;$$;
create or replace function public.get_spool_accounts() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Service administrator required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('email',u.email,'mode',coalesce(a.mode,'standard'),'features',coalesce(a.features,'{}'::jsonb),'is_admin',exists(select 1 from public.spool_admins s where s.email=u.email),'display_name',left(coalesce(nullif(au.raw_user_meta_data->>'spool_display_name',''),nullif(au.raw_user_meta_data->>'full_name',''),'未ログイン'),50),'display_id',case when au.raw_user_meta_data->>'spool_handle' ~ '^[a-z0-9_]{3,30}$' then au.raw_user_meta_data->>'spool_handle' else '' end) order by u.email) from public.spool_users u left join public.spool_account_limits a on a.email=u.email left join auth.users au on lower(au.email)=u.email),'[]'::jsonb);
end;$$;
create or replace function public.set_spool_account_access(target_email text,access_mode text,feature_settings jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Service administrator required' using errcode='42501';end if;
 target_email:=lower(trim(target_email));
 if access_mode is null or access_mode not in ('standard','shared_only','disabled') or feature_settings is null or jsonb_typeof(feature_settings)<>'object' then raise exception 'Invalid account settings' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(feature_settings) where not(key=any(public.spool_account_feature_keys())) or jsonb_typeof(value)<>'boolean') then raise exception 'Invalid account features' using errcode='22023';end if;
 if target_email=lower(auth.jwt()->>'email') and (access_mode<>'standard' or exists(select 1 from jsonb_each(feature_settings) where value='false'::jsonb)) then raise exception 'Cannot restrict your own service administrator account' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('spool-account-access'));
 if exists(select 1 from public.spool_admins where email=target_email) and access_mode='disabled' and (select count(*) from public.spool_admins s left join public.spool_account_limits a on a.email=s.email where coalesce(a.mode,'standard')<>'disabled')<=1 then raise exception 'Last service administrator must remain active' using errcode='42501';end if;
 if not exists(select 1 from public.spool_users where email=target_email) then raise exception 'Account not found' using errcode='22023';end if;
 insert into public.spool_account_limits(email,mode,features) values(target_email,access_mode,feature_settings) on conflict(email) do update set mode=excluded.mode,features=excluded.features;
end;$$;
revoke execute on function public.spool_account_feature_keys(),public.spool_account_feature(text),public.get_spool_accounts(),public.set_spool_account_access(text,text,jsonb) from public,anon;
grant execute on function public.spool_account_feature_keys(),public.spool_account_feature(text),public.get_spool_accounts(),public.set_spool_account_access(text,text,jsonb) to authenticated;
commit;
