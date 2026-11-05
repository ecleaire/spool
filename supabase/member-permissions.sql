-- Apply after selective-sharing.sql and library-appearance.sql. Existing roles are unchanged until configured.
begin;
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
commit;
