-- Purchase wishes and independent create/edit grants. Keeps existing roles and data.
begin;
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
commit;
notify pgrst, 'reload schema';
