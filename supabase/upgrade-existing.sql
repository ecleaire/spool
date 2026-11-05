-- Existing SPOOL database upgrade. Requires schema.sql already installed.
-- Preserves existing accounts, libraries, inventory and sharing choices.
begin;

-- account-management.sql
-- Add to an existing SPOOL database. No existing account is promoted automatically.

create table if not exists public.spool_admins (
 email text primary key references public.spool_users(email) on delete cascade,
 check(email=lower(email))
);
alter table public.spool_admins enable row level security;
revoke all on public.spool_admins from public,anon,authenticated;
create or replace function public.spool_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.spool_admins where email=lower(auth.jwt()->>'email'));
$$;
create or replace function public.allow_spool_account(target_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 target_email:=lower(trim(coalesce(target_email,'')));
 if length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 insert into public.spool_users(email) values(target_email) on conflict do nothing;
end;
$$;
create or replace function public.grant_spool_admin(target_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 target_email:=lower(trim(coalesce(target_email,'')));
 perform public.allow_spool_account(target_email);
 insert into public.spool_admins(email) values(target_email) on conflict do nothing;
end;
$$;
revoke execute on function public.grant_spool_admin(text) from public,anon;
grant execute on function public.grant_spool_admin(text) to authenticated;
revoke execute on function public.spool_is_admin(),public.allow_spool_account(text) from public,anon;
grant execute on function public.spool_is_admin(),public.allow_spool_account(text) to authenticated;


-- shared-libraries.sql
-- Existing installations: run once in SQL Editor. Safe to reapply.

create or replace function public.create_shared_library(library_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if not public.spool_allowed() then raise exception 'SPOOL invitation required' using errcode='42501'; end if;
 library_name:=trim(coalesce(library_name,''));
 if length(library_name) not between 1 and 80 then raise exception 'Invalid library name'; end if;
 insert into public.libraries(name,owner_id,personal) values(library_name,auth.uid(),false) returning id into new_id;
 insert into public.library_members(library_id,user_id,role) values(new_id,auth.uid(),'owner');
 insert into public.library_state(library_id) values(new_id);
 return new_id;
end;
$$;
revoke execute on function public.create_shared_library(text) from public,anon;
grant execute on function public.create_shared_library(text) to authenticated;


-- library-aggregation.sql
-- Apply after shared-libraries.sql. Does not enable any sharing automatically.

create table if not exists public.shared_library_sources (
 shared_library_id uuid references public.libraries(id) on delete cascade,
 source_library_id uuid references public.libraries(id) on delete cascade,
 primary key(shared_library_id,source_library_id),check(shared_library_id<>source_library_id)
);
alter table public.shared_library_sources enable row level security;
revoke all on public.shared_library_sources from public,anon,authenticated;
create or replace function public.share_my_filaments(shared_lib uuid, enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare source_id uuid;
begin
 if not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501'; end if;
 select id into source_id from public.libraries where owner_id=auth.uid() and personal;
 if source_id is null then raise exception 'Personal library required'; end if;
 if enabled then insert into public.shared_library_sources values(shared_lib,source_id) on conflict do nothing;
 else delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_id; end if;
end;
$$;
create or replace function public.my_filaments_shared(shared_lib uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_member(shared_lib) and exists(select 1 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id where s.shared_library_id=shared_lib and l.owner_id=auth.uid());
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id and l.personal
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib),'[]'::jsonb);
end;
$$;
revoke execute on function public.share_my_filaments(uuid,boolean),public.my_filaments_shared(uuid),public.get_shared_filaments(uuid) from public,anon;
grant execute on function public.share_my_filaments(uuid,boolean),public.my_filaments_shared(uuid),public.get_shared_filaments(uuid) to authenticated;


-- library-combination.sql
-- Choose an owned source library instead of being limited to one's personal library.

create or replace function public.share_library_into(shared_lib uuid,source_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501'; end if;
 if not enabled then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib; return; end if;
 if source_lib=shared_lib or not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501'; end if;
 insert into public.shared_library_sources values(shared_lib,source_lib) on conflict do nothing;
end;
$$;
create or replace function public.library_is_shared(shared_lib uuid,source_lib uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_owner(source_lib) and exists(select 1 from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib);
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib),'[]'::jsonb);
end;
$$;
revoke execute on function public.share_library_into(uuid,uuid,boolean),public.library_is_shared(uuid,uuid) from public,anon;
grant execute on function public.share_library_into(uuid,uuid,boolean),public.library_is_shared(uuid,uuid) to authenticated;


-- selective-sharing.sql
-- Apply after library-combination.sql. Existing full-library sharing is preserved.

alter table public.shared_library_sources add column if not exists share_mode text not null default 'all' check(share_mode in ('all','selected'));
alter table public.shared_library_sources add column if not exists included_ids text[] not null default '{}';
alter table public.shared_library_sources add column if not exists excluded_ids text[] not null default '{}';

create or replace function public.set_filament_sharing(shared_lib uuid,source_lib uuid,sharing_mode text,item_ids text[] default '{}',excluded_item_ids text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501'; end if;
 if sharing_mode='none' then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib;return;end if;
 if source_lib=shared_lib or not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 if sharing_mode is null or sharing_mode not in ('all','selected') or item_ids is null or cardinality(item_ids)>5000 or excluded_item_ids is null or cardinality(excluded_item_ids)>5000 or exists(select 1 from unnest(excluded_item_ids) id where id is null or length(id)>120 or length(id)=0) or exists(select 1 from unnest(item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 if sharing_mode='selected' and exists(select 1 from unnest(item_ids) id where not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'items') e where st.library_id=source_lib and e->>'id'=id)) then raise exception 'Unknown source filament' using errcode='22023';end if;
 insert into public.shared_library_sources(shared_library_id,source_library_id,share_mode,included_ids,excluded_ids)
 values(shared_lib,source_lib,sharing_mode,case when sharing_mode='selected' then array(select distinct unnest(item_ids)) else '{}'::text[] end,case when sharing_mode='all' then array(select distinct unnest(excluded_item_ids)) else '{}'::text[] end)
 on conflict(shared_library_id,source_library_id) do update set share_mode=excluded.share_mode,included_ids=excluded.included_ids,excluded_ids=excluded.excluded_ids;
end;
$$;
create or replace function public.get_filament_sharing(source_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('shared_library_id',s.shared_library_id,'shared_library_name',l.name,'mode',s.share_mode,'active',public.spool_member(s.shared_library_id,true),'included_ids',s.included_ids,'excluded_ids',s.excluded_ids)) from public.shared_library_sources s join public.libraries l on l.id=s.shared_library_id where s.source_library_id=source_lib),'[]'::jsonb);
end;
$$;
create or replace function public.stop_shared_filaments(shared_lib uuid,source_lib uuid,item_ids text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not (public.spool_owner(source_lib) or public.spool_owner(shared_lib)) then raise exception 'Source or shared library owner required' using errcode='42501';end if;
 if item_ids is null or cardinality(item_ids)=0 or cardinality(item_ids)>5000 or exists(select 1 from unnest(item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 update public.shared_library_sources set included_ids=array(select unnest(included_ids) except select unnest(item_ids)),excluded_ids=case when share_mode='all' then array(select distinct unnest(excluded_ids||item_ids)) else excluded_ids end where shared_library_id=shared_lib and source_library_id=source_lib;
end;
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'source_item_id',entry.value->>'id','can_stop',public.spool_owner(l.id) or public.spool_owner(shared_lib),'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib and ((s.share_mode='all' and not (entry.value->>'id'=any(s.excluded_ids))) or (s.share_mode='selected' and entry.value->>'id'=any(s.included_ids)))),'[]'::jsonb);
end;
$$;
-- Legacy enable operations explicitly select full, future-inclusive sharing.
create or replace function public.share_library_into(shared_lib uuid,source_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.set_filament_sharing(shared_lib,source_lib,case when enabled then 'all' else 'none' end,'{}');
end;
$$;
create or replace function public.share_my_filaments(shared_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare source_id uuid;
begin
 select id into source_id from public.libraries where owner_id=auth.uid() and personal;
 if source_id is null then raise exception 'Personal library required';end if;
 perform public.set_filament_sharing(shared_lib,source_id,case when enabled then 'all' else 'none' end,'{}');
end;
$$;
revoke execute on function public.set_filament_sharing(uuid,uuid,text,text[],text[]),public.get_filament_sharing(uuid),public.stop_shared_filaments(uuid,uuid,text[]) from public,anon;
grant execute on function public.set_filament_sharing(uuid,uuid,text,text[],text[]),public.get_filament_sharing(uuid),public.stop_shared_filaments(uuid,uuid,text[]) to authenticated;


-- library-appearance.sql
-- Personal appearance is private-owner managed; shared appearance allows member admins too.

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


-- member-permissions.sql
-- Apply after selective-sharing.sql and library-appearance.sql. Existing roles are unchanged until configured.

alter table public.library_members add column if not exists permissions jsonb;
create or replace function public.spool_permission_keys() returns text[] language sql immutable set search_path='' as $$
 select array['inventory_create','inventory_edit','inventory_delete','inventory_use','bookings_create','bookings_edit','bookings_delete','files_upload','files_delete','sharing_manage'];
$$;
create or replace function public.spool_has_permission(lib uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select cap=any(public.spool_permission_keys()) and public.spool_member(lib) and (public.spool_owner(lib) or exists(select 1 from public.library_members m where m.library_id=lib and m.user_id=auth.uid() and m.role='editor' and (m.permissions is null or coalesce((m.permissions->>cap)::boolean,false))));
$$;
create or replace function public.get_my_library_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 return (select jsonb_object_agg(cap,public.spool_has_permission(lib,cap)) from unnest(public.spool_permission_keys()) cap);
end;
$$;
create or replace function public.get_library_member_permissions(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_owner(lib) or not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library owner required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'role',role,'permissions',permissions)) from public.library_members where library_id=lib),'[]'::jsonb);
end;
$$;
create or replace function public.set_library_member_permissions(lib uuid,target_user uuid,member_role text,grants jsonb default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(lib) or not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library owner required' using errcode='42501';end if;
 if exists(select 1 from public.libraries where id=lib and owner_id=target_user) or exists(select 1 from public.library_members where library_id=lib and user_id=target_user and role='owner') then raise exception 'Owner permissions cannot be changed' using errcode='42501';end if;
 if member_role is null or member_role not in ('viewer','editor') then raise exception 'Invalid member role' using errcode='22023';end if;
 if grants is not null then
  if jsonb_typeof(grants)<>'object' then raise exception 'Invalid permission settings' using errcode='22023';end if;
  if exists(select 1 from jsonb_each(grants) where not(key=any(public.spool_permission_keys())) or jsonb_typeof(value)<>'boolean') then raise exception 'Invalid permission settings' using errcode='22023';end if;
 end if;
 perform 1 from public.library_members where library_id=lib and user_id=target_user for update;
 if not found then raise exception 'Member not found' using errcode='22023';end if;
 update public.library_members set role=member_role,permissions=case when member_role='viewer' then null else grants end where library_id=lib and user_id=target_user;
end;
$$;
create or replace function public.save_library_state(lib uuid,expected_revision integer,next_state jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;next_revision integer;section text;entry record;file_entry jsonb;changed boolean;prefix text;
begin
 if not public.spool_member(lib,true) then raise exception 'Editor required' using errcode='42501';end if;
 if jsonb_typeof(next_state)<>'object' or not(next_state ?& array['items','reservations','customColorPresets','deleted']) or jsonb_typeof(next_state->'items')<>'array' or jsonb_typeof(next_state->'reservations')<>'array' or jsonb_typeof(next_state->'customColorPresets')<>'array' or jsonb_typeof(next_state->'deleted')<>'array' or octet_length(next_state::text)>10000000 then raise exception 'Invalid library data (10 MB maximum)';end if;
 select * into old from public.library_state where library_id=lib for update;
 if old.revision is distinct from expected_revision then raise exception 'Library changed; reload before saving' using errcode='40001';end if;
 if next_state=old.state then return old.revision;end if;
 foreach section in array array['items','reservations'] loop
  prefix:=case when section='items' then 'inventory' else 'bookings' end;changed:=false;
  if exists(select 1 from jsonb_array_elements(next_state->section) e where jsonb_typeof(e)<>'object' or jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 120) or (select count(*) from jsonb_array_elements(next_state->section))<>(select count(distinct e->>'id') from jsonb_array_elements(next_state->section) e) then raise exception 'Invalid library data: unique IDs required' using errcode='22023';end if;
  for entry in select before.value as previous,after.value as upcoming from jsonb_array_elements(old.state->section) before full join jsonb_array_elements(next_state->section) after on before.value->>'id'=after.value->>'id' loop
   if entry.previous is not distinct from entry.upcoming then continue;end if;changed:=true;
   if entry.previous is null then
    if not public.spool_has_permission(lib,prefix||'_create') then raise exception 'Permission denied: % create',prefix using errcode='42501';end if;
   elsif entry.upcoming is null then
    if not public.spool_has_permission(lib,prefix||'_delete') then raise exception 'Permission denied: % delete',prefix using errcode='42501';end if;
   elsif section='items' and entry.previous-'remaining'=entry.upcoming-'remaining' then
    if not(public.spool_has_permission(lib,'inventory_use') or public.spool_has_permission(lib,'inventory_edit')) then raise exception 'Permission denied: inventory use' using errcode='42501';end if;
   elsif not public.spool_has_permission(lib,prefix||'_edit') then raise exception 'Permission denied: % edit',prefix using errcode='42501';end if;
   if section='reservations' then
    for file_entry in select value from jsonb_array_elements(coalesce(entry.upcoming->'attachments','[]'::jsonb)) loop
     if not(coalesce(entry.previous->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) and not public.spool_has_permission(lib,'files_upload') then raise exception 'Permission denied: file upload' using errcode='42501';end if;
    end loop;
    for file_entry in select value from jsonb_array_elements(coalesce(entry.previous->'attachments','[]'::jsonb)) loop
     if not(coalesce(entry.upcoming->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) and not public.spool_has_permission(lib,'files_delete') then raise exception 'Permission denied: file delete' using errcode='42501';end if;
    end loop;
   end if;
  end loop;
  if not changed and next_state->section is distinct from old.state->section and not public.spool_has_permission(lib,prefix||'_edit') then raise exception 'Permission denied: reorder' using errcode='42501';end if;
 end loop;
 if next_state->'customColorPresets' is distinct from old.state->'customColorPresets' and not public.spool_has_permission(lib,'inventory_edit') then raise exception 'Permission denied: color presets' using errcode='42501';end if;
 if next_state->'deleted' is distinct from old.state->'deleted' and not(public.spool_has_permission(lib,'inventory_create') or public.spool_has_permission(lib,'inventory_delete')) then raise exception 'Permission denied: inventory trash' using errcode='42501';end if;
 if next_state-array['items','reservations','customColorPresets','deleted'] is distinct from old.state-array['items','reservations','customColorPresets','deleted'] and not(public.spool_has_permission(lib,'inventory_edit') and public.spool_has_permission(lib,'bookings_edit')) then raise exception 'Permission denied: library metadata' using errcode='42501';end if;
 insert into public.library_history values(lib,old.revision,old.state,old.updated_by,old.updated_at);
 next_revision:=old.revision+1;
 update public.library_state set state=next_state,revision=next_revision,updated_by=auth.uid(),updated_at=now() where library_id=lib;
 delete from public.library_history where library_id=lib and revision<next_revision-50;
 return next_revision;
end;
$$;
drop policy if exists file_insert on public.library_files;
create policy file_insert on public.library_files for insert to authenticated with check(public.spool_has_permission(library_id,'files_upload') and created_by=auth.uid());
drop policy if exists file_delete on public.library_files;
create policy file_delete on public.library_files for delete to authenticated using(public.spool_has_permission(library_id,'files_delete') or (public.spool_member(library_id) and created_by=auth.uid() and not exists(select 1 from storage.objects o where o.bucket_id='spool-models' and o.name=object_path)));
drop policy if exists spool_object_insert on storage.objects;
create policy spool_object_insert on storage.objects for insert to authenticated with check(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_has_permission(f.library_id,'files_upload')));
drop policy if exists spool_object_delete on storage.objects;
create policy spool_object_delete on storage.objects for delete to authenticated using(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_has_permission(f.library_id,'files_delete')));
create or replace function public.set_filament_sharing(shared_lib uuid,source_lib uuid,sharing_mode text,item_ids text[] default '{}',excluded_item_ids text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501'; end if;
 if sharing_mode='none' then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib;return;end if;
 if source_lib=shared_lib or not public.spool_has_permission(shared_lib,'sharing_manage') or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 if sharing_mode is null or sharing_mode not in ('all','selected') or item_ids is null or cardinality(item_ids)>5000 or excluded_item_ids is null or cardinality(excluded_item_ids)>5000 or exists(select 1 from unnest(excluded_item_ids) id where id is null or length(id)>120 or length(id)=0) or exists(select 1 from unnest(item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 if sharing_mode='selected' and exists(select 1 from unnest(item_ids) id where not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'items') e where st.library_id=source_lib and e->>'id'=id)) then raise exception 'Unknown source filament' using errcode='22023';end if;
 insert into public.shared_library_sources(shared_library_id,source_library_id,share_mode,included_ids,excluded_ids)
 values(shared_lib,source_lib,sharing_mode,case when sharing_mode='selected' then array(select distinct unnest(item_ids)) else '{}'::text[] end,case when sharing_mode='all' then array(select distinct unnest(excluded_item_ids)) else '{}'::text[] end)
 on conflict(shared_library_id,source_library_id) do update set share_mode=excluded.share_mode,included_ids=excluded.included_ids,excluded_ids=excluded.excluded_ids;
end;
$$;

revoke execute on function public.spool_permission_keys(),public.spool_has_permission(uuid,text),public.get_my_library_permissions(uuid),public.get_library_member_permissions(uuid),public.set_library_member_permissions(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.spool_permission_keys(),public.spool_has_permission(uuid,text),public.get_my_library_permissions(uuid),public.get_library_member_permissions(uuid),public.set_library_member_permissions(uuid,uuid,text,jsonb) to authenticated;


-- library-administrators.sql
-- Shared-library scoped administrators. Apply after member-permissions.sql.

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


-- library-lifecycle.sql
-- Apply after library-administrators.sql. No library is deleted by this migration.

create or replace function public.spool_file_upload_allowed(lib uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for key share;
 if not found then return false;end if;
 return public.spool_has_permission(lib,'files_upload');
end;
$$;
drop policy if exists file_insert on public.library_files;
create policy file_insert on public.library_files for insert to authenticated with check(public.spool_file_upload_allowed(library_id) and created_by=auth.uid());
drop policy if exists spool_object_insert on storage.objects;
create policy spool_object_insert on storage.objects for insert to authenticated with check(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_file_upload_allowed(f.library_id)));
create or replace function public.get_shared_library_deletion_info(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.spool_owner(lib) then raise exception 'Host required' using errcode='42501';end if;
 select jsonb_build_object('name',l.name,'revision',s.revision,'object_paths',coalesce((select jsonb_agg(f.object_path) from public.library_files f where f.library_id=lib),'[]'::jsonb)) into result from public.libraries l join public.library_state s on s.library_id=l.id where l.id=lib and not l.personal;
 if result is null then raise exception 'Shared library required' using errcode='22023';end if;
 return result;
end;
$$;
create or replace function public.delete_shared_library(lib uuid,confirmation_name text,expected_revision integer,confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.libraries;
begin
 select * into target from public.libraries where id=lib for update;
 if not found or not public.spool_owner(lib) then raise exception 'Host required' using errcode='42501';end if;
 if target.personal then raise exception 'Personal library cannot be deleted' using errcode='22023';end if;
 if confirmed is distinct from true or confirmation_name is distinct from target.name then raise exception 'Two-stage confirmation required' using errcode='22023';end if;
 if (select revision from public.library_state where library_id=lib) is distinct from expected_revision then raise exception 'Library changed; reload before deleting' using errcode='40001';end if;
 if exists(select 1 from storage.objects where bucket_id='spool-models' and left(name,length(lib::text)+1)=lib::text||'/') then raise exception 'Storage files remain; remove using Storage API before deleting' using errcode='55000';end if;
 delete from public.libraries where id=lib;
end;
$$;
create or replace function public.leave_shared_library(lib uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for update;
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 if not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library required' using errcode='22023';end if;
 if public.spool_owner(lib) then raise exception 'Host cannot leave; delete the shared library instead' using errcode='42501';end if;
 delete from public.shared_library_sources s using public.libraries l where s.shared_library_id=lib and s.source_library_id=l.id and l.owner_id=auth.uid();
 delete from public.library_invitations where library_id=lib and email=lower(auth.jwt()->>'email');
 delete from public.library_members where library_id=lib and user_id=auth.uid();
end;
$$;
revoke execute on function public.spool_file_upload_allowed(uuid),public.get_shared_library_deletion_info(uuid),public.delete_shared_library(uuid,text,integer,boolean),public.leave_shared_library(uuid) from public,anon;
grant execute on function public.spool_file_upload_allowed(uuid),public.get_shared_library_deletion_info(uuid),public.delete_shared_library(uuid,text,integer,boolean),public.leave_shared_library(uuid) to authenticated;


-- account-access.sql
-- Per-account service limits. Existing accounts retain their current access.

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


-- purchase-plan-sharing.sql
-- Purchase plans are shared only by explicit selection, even in future-inclusive sharing.

create or replace function public.set_filament_sharing(shared_lib uuid,source_lib uuid,sharing_mode text,item_ids text[] default '{}',excluded_item_ids text[] default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501';end if;
 if sharing_mode='none' then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib;return;end if;
 if source_lib=shared_lib or not public.spool_has_permission(shared_lib,'sharing_manage') or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 if sharing_mode is null or sharing_mode not in ('all','selected') or item_ids is null or cardinality(item_ids)>5000 or excluded_item_ids is null or cardinality(excluded_item_ids)>5000 or exists(select 1 from unnest(excluded_item_ids||item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 if exists(select 1 from unnest(item_ids) id where not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'items') e where st.library_id=source_lib and e->>'id'=id)) then raise exception 'Unknown source filament' using errcode='22023';end if;
 insert into public.shared_library_sources(shared_library_id,source_library_id,share_mode,included_ids,excluded_ids) values(shared_lib,source_lib,sharing_mode,case when sharing_mode='all' then array(select e->>'id' from public.library_state st cross join lateral jsonb_array_elements(st.state->'items') e where st.library_id=source_lib and e->>'inventoryStatus'='planned' and e->>'id'=any(item_ids)) else array(select distinct unnest(item_ids)) end,case when sharing_mode='all' then array(select distinct unnest(excluded_item_ids)) else '{}'::text[] end)
 on conflict(shared_library_id,source_library_id) do update set share_mode=excluded.share_mode,included_ids=excluded.included_ids,excluded_ids=excluded.excluded_ids;
end;$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'source_item_id',entry.value->>'id','source_revision',st.revision,'can_edit_plan',entry.value->>'inventoryStatus'='planned' and public.spool_has_permission(shared_lib,'inventory_edit'),'can_stop',public.spool_owner(l.id) or public.spool_owner(shared_lib),'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib and ((entry.value->>'inventoryStatus'='planned' and entry.value->>'id'=any(s.included_ids)) or (coalesce(entry.value->>'inventoryStatus','owned')<>'planned' and ((s.share_mode='all' and not(entry.value->>'id'=any(s.excluded_ids))) or (s.share_mode='selected' and entry.value->>'id'=any(s.included_ids)))))),'[]'::jsonb);
end;$$;
create or replace function public.update_shared_purchase_plan(shared_lib uuid,source_lib uuid,item_id text,expected_revision integer,changes jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;entry jsonb;upcoming jsonb;next_state jsonb;slot integer;link public.shared_library_sources;
begin
 if not public.spool_has_permission(shared_lib,'inventory_edit') or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 select * into link from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib for share;
 if not found or not(item_id=any(link.included_ids)) or not exists(select 1 from public.libraries l join public.library_members m on m.library_id=shared_lib and m.user_id=l.owner_id and m.role in ('owner','editor') where l.id=source_lib) then raise exception 'Explicit purchase-plan sharing required' using errcode='42501';end if;
 select * into old from public.library_state where library_id=source_lib for update;
 if old.revision is distinct from expected_revision then raise exception 'Source library changed; reload before editing' using errcode='40001';end if;
 select value,(ordinality-1)::integer into entry,slot from jsonb_array_elements(old.state->'items') with ordinality where value->>'id'=item_id;
 if entry is null or entry->>'inventoryStatus' is distinct from 'planned' then raise exception 'Shared purchase plan required' using errcode='22023';end if;
 if changes is null or jsonb_typeof(changes)<>'object' or exists(select 1 from jsonb_object_keys(changes) k where k not in ('name','colorName','color','inventoryStatus','remaining','capacity','location','note','amazonUrl','shopUrl')) then raise exception 'Invalid purchase-plan changes' using errcode='22023';end if;
 upcoming:=entry||changes;
 if jsonb_typeof(upcoming->'name') is distinct from 'string' or length(trim(upcoming->>'name')) not between 1 and 100 or jsonb_typeof(upcoming->'colorName') is distinct from 'string' or length(trim(upcoming->>'colorName')) not between 1 and 100 or coalesce(upcoming->>'color','') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(upcoming->>'inventoryStatus','') not in ('planned','owned') then raise exception 'Invalid purchase-plan data' using errcode='22023';end if;
 if jsonb_typeof(upcoming->'remaining') is distinct from 'number' or jsonb_typeof(upcoming->'capacity') is distinct from 'number' then raise exception 'Invalid purchase-plan weight' using errcode='22023';end if;
 if (upcoming->>'remaining')::numeric<0 or (upcoming->>'capacity')::numeric<=0 or (upcoming->>'capacity')::numeric>100000 or (upcoming->>'remaining')::numeric>(upcoming->>'capacity')::numeric then raise exception 'Invalid purchase-plan weight' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(changes) where key in ('location','note','amazonUrl','shopUrl') and (jsonb_typeof(value)<>'string' or length(value#>>'{}')>3000)) then raise exception 'Invalid purchase-plan text' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(changes) where key in ('amazonUrl','shopUrl') and value#>>'{}'<>'' and value#>>'{}' !~* '^https?://[^/@[:space:]]+([/:?#]|$)') then raise exception 'Invalid purchase-plan URL' using errcode='22023';end if;
 next_state:=jsonb_set(old.state,array['items',slot::text],upcoming);
 if octet_length(next_state::text)>10000000 then raise exception 'Library data maximum exceeded';end if;
 if next_state=old.state then return old.revision;end if;
 insert into public.library_history values(source_lib,old.revision,old.state,old.updated_by,old.updated_at);
 update public.library_state set state=next_state,revision=old.revision+1,updated_by=auth.uid(),updated_at=now() where library_id=source_lib;
 delete from public.library_history where library_id=source_lib and revision<old.revision+1-50;
 return old.revision+1;
end;$$;
revoke execute on function public.update_shared_purchase_plan(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function public.update_shared_purchase_plan(uuid,uuid,text,integer,jsonb) to authenticated;


-- purchase-wishes.sql
-- Purchase wishes and independent create/edit grants. Keeps existing roles and data.

create or replace function public.spool_permission_keys() returns text[] language sql immutable set search_path='' as $$
 select array['inventory_create','inventory_edit','inventory_delete','inventory_use','bookings_create','bookings_edit','bookings_delete','files_upload','files_delete','sharing_manage','purchase_create','purchase_edit','wishlist_create','wishlist_edit'];
$$;
create or replace function public.spool_item_kind(item jsonb) returns text language sql immutable set search_path='' as $$
 select case when item->>'inventoryStatus'='planned' then case when item->>'purchaseIntent'='wish' then 'wishlist' else 'purchase' end else 'inventory' end;
$$;
-- Preserve the previous scope for custom grants and account restrictions; repeatable.
update public.library_members set permissions=jsonb_build_object('purchase_create',coalesce((permissions->>'inventory_create')::boolean,false),'purchase_edit',coalesce((permissions->>'inventory_edit')::boolean,false),'wishlist_create',coalesce((permissions->>'inventory_create')::boolean,false),'wishlist_edit',coalesce((permissions->>'inventory_edit')::boolean,false))||permissions where permissions is not null and not(permissions ?& array['purchase_create','purchase_edit','wishlist_create','wishlist_edit']);
update public.spool_account_limits set features=jsonb_build_object('purchase_create',coalesce((features->>'inventory_create')::boolean,true),'purchase_edit',coalesce((features->>'inventory_edit')::boolean,true),'wishlist_create',coalesce((features->>'inventory_create')::boolean,true),'wishlist_edit',coalesce((features->>'inventory_edit')::boolean,true))||features where not(features ?& array['purchase_create','purchase_edit','wishlist_create','wishlist_edit']);
create or replace function public.save_library_state(lib uuid,expected_revision integer,next_state jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;next_revision integer;section text;entry record;file_entry jsonb;changed boolean;prefix text;
begin
 if not public.spool_member(lib,true) then raise exception 'Editor required' using errcode='42501';end if;
 if jsonb_typeof(next_state)<>'object' or not(next_state ?& array['items','reservations','customColorPresets','deleted']) or jsonb_typeof(next_state->'items')<>'array' or jsonb_typeof(next_state->'reservations')<>'array' or jsonb_typeof(next_state->'customColorPresets')<>'array' or jsonb_typeof(next_state->'deleted')<>'array' or octet_length(next_state::text)>10000000 then raise exception 'Invalid library data (10 MB maximum)';end if;
 select * into old from public.library_state where library_id=lib for update;
 if old.revision is distinct from expected_revision then raise exception 'Library changed; reload before saving' using errcode='40001';end if;
 if next_state=old.state then return old.revision;end if;
 foreach section in array array['items','reservations'] loop
  prefix:=case when section='items' then 'inventory' else 'bookings' end;changed:=false;
  if exists(select 1 from jsonb_array_elements(next_state->section) e where jsonb_typeof(e)<>'object' or jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 120) or (select count(*) from jsonb_array_elements(next_state->section))<>(select count(distinct e->>'id') from jsonb_array_elements(next_state->section) e) then raise exception 'Invalid library data: unique IDs required' using errcode='22023';end if;
  for entry in select before.value as previous,after.value as upcoming from jsonb_array_elements(old.state->section) before full join jsonb_array_elements(next_state->section) after on before.value->>'id'=after.value->>'id' loop
   if entry.previous is not distinct from entry.upcoming then continue;end if;changed:=true;
   if section='items' and entry.upcoming is not null and entry.upcoming ? 'purchaseIntent' and (jsonb_typeof(entry.upcoming->'purchaseIntent')<>'string' or entry.upcoming->>'purchaseIntent' not in ('planned','wish')) then raise exception 'Invalid purchase intent' using errcode='22023';end if;
   if section='items' and entry.upcoming is not null and (entry.previous is null or entry.previous->>'inventoryStatus'='planned' or entry.upcoming->>'inventoryStatus'='planned') then
    if entry.previous is null then
     if not public.spool_has_permission(lib,public.spool_item_kind(entry.upcoming)||'_create') then raise exception 'Permission denied: purchase create' using errcode='42501';end if;
    else
     if not public.spool_has_permission(lib,public.spool_item_kind(entry.previous)||'_edit') or (public.spool_item_kind(entry.previous)<>public.spool_item_kind(entry.upcoming) and not public.spool_has_permission(lib,public.spool_item_kind(entry.upcoming)||'_create')) then raise exception 'Permission denied: purchase edit or conversion' using errcode='42501';end if;
    end if;
   elsif entry.previous is null then
    if not public.spool_has_permission(lib,prefix||'_create') then raise exception 'Permission denied: % create',prefix using errcode='42501';end if;
   elsif entry.upcoming is null then
    if not public.spool_has_permission(lib,prefix||'_delete') then raise exception 'Permission denied: % delete',prefix using errcode='42501';end if;
   elsif section='items' and entry.previous-'remaining'=entry.upcoming-'remaining' then
    if not(public.spool_has_permission(lib,'inventory_use') or public.spool_has_permission(lib,'inventory_edit')) then raise exception 'Permission denied: inventory use' using errcode='42501';end if;
   elsif not public.spool_has_permission(lib,prefix||'_edit') then raise exception 'Permission denied: % edit',prefix using errcode='42501';end if;
   if section='reservations' then
    for file_entry in select value from jsonb_array_elements(coalesce(entry.upcoming->'attachments','[]'::jsonb)) loop
     if not(coalesce(entry.previous->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) and not public.spool_has_permission(lib,'files_upload') then raise exception 'Permission denied: file upload' using errcode='42501';end if;
    end loop;
    for file_entry in select value from jsonb_array_elements(coalesce(entry.previous->'attachments','[]'::jsonb)) loop
     if not(coalesce(entry.upcoming->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) and not public.spool_has_permission(lib,'files_delete') then raise exception 'Permission denied: file delete' using errcode='42501';end if;
    end loop;
   end if;
  end loop;
  if not changed and next_state->section is distinct from old.state->section and not public.spool_has_permission(lib,prefix||'_edit') then raise exception 'Permission denied: reorder' using errcode='42501';end if;
 end loop;
 if next_state->'customColorPresets' is distinct from old.state->'customColorPresets' and not public.spool_has_permission(lib,'inventory_edit') then raise exception 'Permission denied: color presets' using errcode='42501';end if;
 if next_state->'deleted' is distinct from old.state->'deleted' and not(public.spool_has_permission(lib,'inventory_create') or public.spool_has_permission(lib,'inventory_delete')) then raise exception 'Permission denied: inventory trash' using errcode='42501';end if;
 if next_state-array['items','reservations','customColorPresets','deleted'] is distinct from old.state-array['items','reservations','customColorPresets','deleted'] and not(public.spool_has_permission(lib,'inventory_edit') and public.spool_has_permission(lib,'bookings_edit')) then raise exception 'Permission denied: library metadata' using errcode='42501';end if;
 insert into public.library_history values(lib,old.revision,old.state,old.updated_by,old.updated_at);
 next_revision:=old.revision+1;
 update public.library_state set state=next_state,revision=next_revision,updated_by=auth.uid(),updated_at=now() where library_id=lib;
 delete from public.library_history where library_id=lib and revision<next_revision-50;
 return next_revision;
end;
$$;

create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'source_item_id',entry.value->>'id','source_revision',st.revision,'can_edit_plan',entry.value->>'inventoryStatus'='planned' and public.spool_has_permission(shared_lib,public.spool_item_kind(entry.value)||'_edit'),'can_stop',public.spool_owner(l.id) or public.spool_owner(shared_lib),'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib and ((entry.value->>'inventoryStatus'='planned' and entry.value->>'id'=any(s.included_ids)) or (coalesce(entry.value->>'inventoryStatus','owned')<>'planned' and ((s.share_mode='all' and not(entry.value->>'id'=any(s.excluded_ids))) or (s.share_mode='selected' and entry.value->>'id'=any(s.included_ids)))))),'[]'::jsonb);
end;$$;
create or replace function public.update_shared_purchase_plan(shared_lib uuid,source_lib uuid,item_id text,expected_revision integer,changes jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;entry jsonb;upcoming jsonb;next_state jsonb;slot integer;link public.shared_library_sources;
begin
 if not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 select * into link from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib for share;
 if not found or not(item_id=any(link.included_ids)) or not exists(select 1 from public.libraries l join public.library_members m on m.library_id=shared_lib and m.user_id=l.owner_id and m.role in ('owner','editor') where l.id=source_lib) then raise exception 'Explicit purchase-plan sharing required' using errcode='42501';end if;
 select * into old from public.library_state where library_id=source_lib for update;
 if old.revision is distinct from expected_revision then raise exception 'Source library changed; reload before editing' using errcode='40001';end if;
 select value,(ordinality-1)::integer into entry,slot from jsonb_array_elements(old.state->'items') with ordinality where value->>'id'=item_id;
 if entry is null or entry->>'inventoryStatus' is distinct from 'planned' then raise exception 'Shared purchase plan required' using errcode='22023';end if;
 if changes is null or jsonb_typeof(changes)<>'object' or exists(select 1 from jsonb_object_keys(changes) k where k not in ('name','colorName','color','inventoryStatus','remaining','capacity','location','note','amazonUrl','shopUrl','purchaseIntent')) then raise exception 'Invalid purchase-plan changes' using errcode='22023';end if;
 upcoming:=entry||changes;
 if not public.spool_has_permission(shared_lib,public.spool_item_kind(entry)||'_edit') or (public.spool_item_kind(entry)<>public.spool_item_kind(upcoming) and not public.spool_has_permission(shared_lib,public.spool_item_kind(upcoming)||'_create')) then raise exception 'Shared library editor required for purchase state' using errcode='42501';end if;
 if upcoming ? 'purchaseIntent' and (jsonb_typeof(upcoming->'purchaseIntent')<>'string' or upcoming->>'purchaseIntent' not in ('planned','wish')) then raise exception 'Invalid purchase intent' using errcode='22023';end if;
 if jsonb_typeof(upcoming->'name') is distinct from 'string' or length(trim(upcoming->>'name')) not between 1 and 100 or jsonb_typeof(upcoming->'colorName') is distinct from 'string' or length(trim(upcoming->>'colorName')) not between 1 and 100 or coalesce(upcoming->>'color','') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(upcoming->>'inventoryStatus','') not in ('planned','owned') then raise exception 'Invalid purchase-plan data' using errcode='22023';end if;
 if jsonb_typeof(upcoming->'remaining') is distinct from 'number' or jsonb_typeof(upcoming->'capacity') is distinct from 'number' then raise exception 'Invalid purchase-plan weight' using errcode='22023';end if;
 if (upcoming->>'remaining')::numeric<0 or (upcoming->>'capacity')::numeric<=0 or (upcoming->>'capacity')::numeric>100000 or (upcoming->>'remaining')::numeric>(upcoming->>'capacity')::numeric then raise exception 'Invalid purchase-plan weight' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(changes) where key in ('location','note','amazonUrl','shopUrl') and (jsonb_typeof(value)<>'string' or length(value#>>'{}')>3000)) then raise exception 'Invalid purchase-plan text' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(changes) where key in ('amazonUrl','shopUrl') and value#>>'{}'<>'' and value#>>'{}' !~* '^https?://[^/@[:space:]]+([/:?#]|$)') then raise exception 'Invalid purchase-plan URL' using errcode='22023';end if;
 next_state:=jsonb_set(old.state,array['items',slot::text],upcoming);
 if octet_length(next_state::text)>10000000 then raise exception 'Library data maximum exceeded';end if;
 if next_state=old.state then return old.revision;end if;
 insert into public.library_history values(source_lib,old.revision,old.state,old.updated_by,old.updated_at);
 update public.library_state set state=next_state,revision=old.revision+1,updated_by=auth.uid(),updated_at=now() where library_id=source_lib;
 delete from public.library_history where library_id=source_lib and revision<old.revision+1-50;
 return old.revision+1;
end;$$;

revoke execute on function public.spool_item_kind(jsonb) from public,anon;
grant execute on function public.spool_item_kind(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
notify pgrst, 'reload schema';
