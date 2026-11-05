-- Purchase plans are shared only by explicit selection, even in future-inclusive sharing.
begin;
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
commit;
