-- Selected personal bookings only. Shared views reference the original; no private bookings are shared by default.
begin;
create table if not exists public.shared_bookings (
 id uuid primary key default gen_random_uuid(), source_library_id uuid not null references public.libraries(id) on delete cascade,
 booking_id text not null check(length(booking_id) between 1 and 120), shared_library_id uuid not null references public.libraries(id) on delete cascade,
 unique(source_library_id,booking_id,shared_library_id),check(source_library_id<>shared_library_id)
);
alter table public.shared_bookings enable row level security;
revoke all on public.shared_bookings from public,anon,authenticated;
create or replace function public.spool_booking_link_active(source_lib uuid,booking text,target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.shared_bookings b join public.libraries l on l.id=b.source_library_id and l.personal
 join public.library_members m on m.library_id=b.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 join public.library_state st on st.library_id=l.id
 where b.source_library_id=source_lib and b.booking_id=booking and b.shared_library_id=target and exists(select 1 from jsonb_array_elements(st.state->'reservations') entry where entry->>'id'=booking));
$$;
create or replace function public.get_booking_sharing(source_lib uuid,booking text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) or not exists(select 1 from public.libraries where id=source_lib and personal) then raise exception 'Personal booking owner required' using errcode='42501';end if;
 if not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'reservations') e where st.library_id=source_lib and e->>'id'=booking) then raise exception 'Booking not found' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'selected',exists(select 1 from public.shared_bookings b where b.source_library_id=source_lib and b.booking_id=booking and b.shared_library_id=l.id),'can_share',public.spool_has_permission(l.id,'sharing_manage'))) from public.libraries l where not l.personal and (public.spool_member(l.id) or exists(select 1 from public.shared_bookings b where b.source_library_id=source_lib and b.booking_id=booking and b.shared_library_id=l.id))),'[]'::jsonb);
end;$$;
create or replace function public.set_booking_sharing(source_lib uuid,booking text,targets uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform 1 from public.libraries where id=source_lib for update;
 perform 1 from public.library_state where library_id=source_lib for update;
 if not public.spool_owner(source_lib) or not exists(select 1 from public.libraries where id=source_lib and personal) then raise exception 'Personal booking owner required' using errcode='42501';end if;
 if targets is null or cardinality(targets)>50 or exists(select 1 from unnest(targets) x where x is null) then raise exception 'Invalid sharing targets' using errcode='22023';end if;
 if not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'reservations') e where st.library_id=source_lib and e->>'id'=booking) then raise exception 'Booking not found' using errcode='22023';end if;
 perform 1 from public.library_state where library_id=any(targets) order by library_id for update;
 foreach target in array targets loop
  if not exists(select 1 from public.libraries where id=target and not personal) then raise exception 'Shared library required' using errcode='22023';end if;
  if not exists(select 1 from public.shared_bookings where source_library_id=source_lib and booking_id=booking and shared_library_id=target) and not public.spool_has_permission(target,'sharing_manage') then raise exception 'Sharing permission required' using errcode='42501';end if;
  if not exists(select 1 from public.shared_bookings where source_library_id=source_lib and booking_id=booking and shared_library_id=target) and (select jsonb_array_length(state->'reservations') from public.library_state where library_id=target)+(select count(*) from public.shared_bookings where shared_library_id=target)>=2000 then raise exception 'Shared booking capacity exceeded' using errcode='22023';end if;
 end loop;
 delete from public.shared_bookings where source_library_id=source_lib and booking_id=booking and not(shared_library_id=any(targets));
 insert into public.shared_bookings(source_library_id,booking_id,shared_library_id) select source_lib,booking,t from unnest(targets) t on conflict do nothing;
end;$$;
create or replace function public.get_shared_bookings(shared_lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'source_id',l.id,'source_name',l.name,'source_booking_id',b.booking_id,'source_revision',st.revision,'can_edit',public.spool_has_permission(shared_lib,'bookings_edit'),'can_delete',public.spool_has_permission(shared_lib,'bookings_delete'),'can_stop',public.spool_owner(l.id) or (public.spool_library_admin(shared_lib) and public.spool_has_permission(shared_lib,'sharing_manage')),'booking',e.value))
 from public.shared_bookings b join public.libraries l on l.id=b.source_library_id join public.library_state st on st.library_id=l.id cross join lateral jsonb_array_elements(st.state->'reservations') e
 where b.shared_library_id=shared_lib and e.value->>'id'=b.booking_id and public.spool_booking_link_active(l.id,b.booking_id,shared_lib)),'[]'::jsonb);
end;$$;
create or replace function public.stop_booking_sharing(shared_lib uuid,source_lib uuid,booking text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=source_lib for update;
 if not(public.spool_owner(source_lib) or (public.spool_library_admin(shared_lib) and public.spool_has_permission(shared_lib,'sharing_manage'))) then raise exception 'Booking owner or shared administrator required' using errcode='42501';end if;
 delete from public.shared_bookings where source_library_id=source_lib and booking_id=booking and shared_library_id=shared_lib;
end;$$;
create or replace function public.spool_booking_file_allowed(lib uuid,booking text,cap text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if cap not in ('read','files_upload','files_delete') then return false;end if;
 if cap<>'read' then perform 1 from public.libraries where id=lib for key share;if not found then return false;end if;end if;
 if (cap='read' and public.spool_member(lib)) or (cap<>'read' and public.spool_has_permission(lib,cap)) then return true;end if;
 return exists(select 1 from public.shared_bookings b where b.source_library_id=lib and b.booking_id=booking and public.spool_booking_link_active(lib,booking,b.shared_library_id) and public.spool_member(b.shared_library_id) and (cap='read' or (public.spool_has_permission(b.shared_library_id,cap) and public.spool_has_permission(b.shared_library_id,'bookings_edit'))));
end;$$;
create or replace function public.spool_validate_shared_booking(b jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare entry jsonb;path text;date_value date;
begin
 if jsonb_typeof(b)<>'object' or jsonb_typeof(b->'id') is distinct from 'string' or length(b->>'id') not between 1 and 120 or jsonb_typeof(b->'title') is distinct from 'string' or length(trim(b->>'title')) not between 1 and 100 or jsonb_typeof(b->'desiredColor') is distinct from 'string' or length(trim(b->>'desiredColor')) not between 1 and 200 or coalesce(b->>'color','') !~ '^#[0-9A-Fa-f]{6}$' then return false;end if;
 if coalesce(b->>'registeredDate','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(b->>'weekday','') not in ('月','火','水','木','金','土','日') or b->>'className' is null or b->>'className' not in ('','A2','A3','EX') or b->>'deadline' is null then return false;end if;
 date_value:=(b->>'registeredDate')::date;if to_char(date_value,'YYYY-MM-DD')<>b->>'registeredDate' then return false;end if;
 if b->>'deadline'<>'' and (b->>'deadline' !~ '^\d{4}-\d{2}-\d{2}$' or to_char((b->>'deadline')::date,'YYYY-MM-DD')<>b->>'deadline' or (b->>'deadline')::date<date_value) then return false;end if;
 if jsonb_typeof(b->'printMinutes') is distinct from 'number' or (b->>'printMinutes')::numeric not between 1 and 60000 or floor((b->>'printMinutes')::numeric)<>(b->>'printMinutes')::numeric then return false;end if;
 if b ? 'registeredTime' and (jsonb_typeof(b->'registeredTime')<>'string' or b->>'registeredTime' !~ '^([01]\d|2[0-3]):[0-5]\d$') then return false;end if;
 if b ? 'creator' and (jsonb_typeof(b->'creator')<>'string' or length(b->>'creator')>100) then return false;end if;
 if b ? 'quality' and (jsonb_typeof(b->'quality') is distinct from 'string' or b->>'quality' not in ('speed','standard','fine')) then return false;end if;
 if b ? 'printStatus' and (jsonb_typeof(b->'printStatus') is distinct from 'string' or b->>'printStatus' not in ('印刷予定','印刷済み','未定')) then return false;end if;
 if b ? 'colorPreference' and (jsonb_typeof(b->'colorPreference') is distinct from 'string' or b->>'colorPreference' not in ('specified','none','random')) then return false;end if;
 if b ? 'colorTranslucent' and jsonb_typeof(b->'colorTranslucent')<>'boolean' then return false;end if;
 if b ? 'tags' then if jsonb_typeof(b->'tags')<>'array' or jsonb_array_length(b->'tags')>20 then return false;end if;for entry in select value from jsonb_array_elements(b->'tags') loop if jsonb_typeof(entry)<>'string' or length(trim(entry#>>'{}')) not between 1 and 30 then return false;end if;end loop;end if;
 if b ? 'requestedFilaments' then if jsonb_typeof(b->'requestedFilaments')<>'array' or jsonb_array_length(b->'requestedFilaments')>64 then return false;end if;for entry in select value from jsonb_array_elements(b->'requestedFilaments') loop if coalesce(entry->>'color','') !~ '^#[0-9A-Fa-f]{6}$' or jsonb_typeof(entry->'type') is distinct from 'string' or length(entry->>'type')>40 then return false;end if;end loop;end if;
 if b ? 'modelColors' then
  if jsonb_typeof(b->'modelColors')<>'array' or jsonb_array_length(b->'modelColors')>20 then return false;end if;
  if (select count(distinct (value->>'kind')||':'||(value->>'id')) from jsonb_array_elements(b->'modelColors'))<>jsonb_array_length(b->'modelColors') then return false;end if;
  for entry in select value from jsonb_array_elements(b->'modelColors') loop
   if jsonb_typeof(entry->'kind') is distinct from 'string' or entry->>'kind' not in ('attachment','reference') or jsonb_typeof(entry->'id') is distinct from 'string' or length(entry->>'id') not between 1 and 2048 or jsonb_typeof(entry->'desiredColor') is distinct from 'string' or length(trim(entry->>'desiredColor')) not between 1 and 200 or coalesce(entry->>'color','') !~ '^#[0-9a-fA-F]{6}$' then return false;end if;
   if entry ? 'colorPreference' and (jsonb_typeof(entry->'colorPreference') is distinct from 'string' or entry->>'colorPreference' not in ('specified','none')) then return false;end if;
   if entry ? 'colorTranslucent' and jsonb_typeof(entry->'colorTranslucent')<>'boolean' then return false;end if;
  end loop;
 end if;
 if b ? 'files' then if jsonb_typeof(b->'files')<>'array' or jsonb_array_length(b->'files')>10 then return false;end if;
  for entry in select value from jsonb_array_elements(b->'files') loop
   path:=entry#>>'{}';if jsonb_typeof(entry)<>'string' or length(trim(path)) not between 1 and 2048 or length(path)>2048 or path ~ '[[:cntrl:]]' then return false;end if;
  end loop;
 end if;
 if b ? 'attachments' then
  if jsonb_typeof(b->'attachments')<>'array' or jsonb_array_length(b->'attachments')>10 or (select count(distinct value->>'id') from jsonb_array_elements(b->'attachments'))<>jsonb_array_length(b->'attachments') then return false;end if;
  for entry in select value from jsonb_array_elements(b->'attachments') loop
   if jsonb_typeof(entry->'id') is distinct from 'string' or length(entry->>'id')>120 or jsonb_typeof(entry->'name') is distinct from 'string' or length(entry->>'name') not between 1 and 240 or entry->>'name' !~* '\.(stl|obj|3mf|amf|step|stp|gcode)$' or jsonb_typeof(entry->'size') is distinct from 'number' or (entry->>'size')::numeric<=0 or floor((entry->>'size')::numeric)<>(entry->>'size')::numeric then return false;end if;
   if entry->>'kind'='online' then if (entry->>'size')::numeric>104857600 or entry ? 'data' then return false;end if;
   elsif entry->>'kind'='embedded' then if (entry->>'size')::numeric>5242880 or jsonb_typeof(entry->'data') is distinct from 'string' or entry->>'data' !~ '^data:application/octet-stream;base64,[A-Za-z0-9+/]*={0,2}$' or length(entry->>'data')>ceil((entry->>'size')::numeric/3)*4+100 then return false;end if;
   else return false;end if;
  end loop;
  if (select coalesce(sum((value->>'size')::numeric),0) from jsonb_array_elements(b->'attachments') where value->>'kind'='embedded')>8388608 then return false;end if;
 end if;
 return true;
exception when others then return false;
end;$$;
create or replace function public.update_shared_booking(shared_lib uuid,source_lib uuid,booking text,expected_revision integer,changes jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;entry jsonb;upcoming jsonb;next_state jsonb;slot integer;file_entry jsonb;
begin
 if not public.spool_has_permission(shared_lib,'bookings_edit') then raise exception 'Booking edit permission required' using errcode='42501';end if;
 select * into old from public.library_state where library_id=source_lib for update;
 perform 1 from public.shared_bookings where shared_library_id=shared_lib and source_library_id=source_lib and booking_id=booking for share;
 if not found or not public.spool_booking_link_active(source_lib,booking,shared_lib) then raise exception 'Explicit booking sharing required' using errcode='42501';end if;
 if old.revision is distinct from expected_revision then raise exception 'Source library changed; reload before editing' using errcode='40001';end if;
 select value,(ordinality-1)::integer into entry,slot from jsonb_array_elements(old.state->'reservations') with ordinality where value->>'id'=booking;
 if changes is null or jsonb_typeof(changes)<>'object' or exists(select 1 from jsonb_object_keys(changes) k where k not in ('title','creator','registeredDate','registeredTime','weekday','className','quality','requestedFilaments','modelColors','printStatus','desiredColor','color','colorPreference','colorTranslucent','printMinutes','deadline','tags','files','attachments')) then raise exception 'Invalid booking changes' using errcode='22023';end if;
 upcoming:=entry||changes;if not public.spool_validate_shared_booking(upcoming) then raise exception 'Invalid booking data' using errcode='22023';end if;
 for file_entry in select value from jsonb_array_elements(coalesce(upcoming->'attachments','[]'::jsonb)) loop
  if not(coalesce(entry->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) then
   if not public.spool_has_permission(shared_lib,'files_upload') then raise exception 'File upload permission required' using errcode='42501';end if;
   if file_entry->>'kind'='online' and not exists(select 1 from public.library_files f where f.id::text=file_entry->>'id' and f.library_id=source_lib and f.booking_id=booking) then raise exception 'Booking attachment required' using errcode='22023';end if;
  end if;
 end loop;
 for file_entry in select value from jsonb_array_elements(coalesce(entry->'attachments','[]'::jsonb)) loop
  if not(coalesce(upcoming->'attachments','[]'::jsonb) @> jsonb_build_array(file_entry)) and not public.spool_has_permission(shared_lib,'files_delete') then raise exception 'File delete permission required' using errcode='42501';end if;
 end loop;
 next_state:=jsonb_set(old.state,array['reservations',slot::text],upcoming);
 if octet_length(next_state::text)>10000000 then raise exception 'Library data maximum exceeded' using errcode='22023';end if;
 if next_state=old.state then return old.revision;end if;
 insert into public.library_history values(source_lib,old.revision,old.state,old.updated_by,old.updated_at);
 update public.library_state set state=next_state,revision=old.revision+1,updated_by=auth.uid(),updated_at=now() where library_id=source_lib;
 delete from public.library_history where library_id=source_lib and revision<old.revision+1-50;return old.revision+1;
end;$$;
create or replace function public.delete_shared_booking(shared_lib uuid,source_lib uuid,booking text,expected_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;entry jsonb;next_state jsonb;
begin
 if not public.spool_has_permission(shared_lib,'bookings_delete') then raise exception 'Booking delete permission required' using errcode='42501';end if;
 select * into old from public.library_state where library_id=source_lib for update;
 perform 1 from public.shared_bookings where shared_library_id=shared_lib and source_library_id=source_lib and booking_id=booking for share;
 if not found or not public.spool_booking_link_active(source_lib,booking,shared_lib) then raise exception 'Explicit booking sharing required' using errcode='42501';end if;
 if old.revision is distinct from expected_revision then raise exception 'Source library changed; reload before deleting' using errcode='40001';end if;
 select value into entry from jsonb_array_elements(old.state->'reservations') where value->>'id'=booking;
 if jsonb_array_length(coalesce(entry->'attachments','[]'::jsonb))>0 and not public.spool_has_permission(shared_lib,'files_delete') then raise exception 'File delete permission required' using errcode='42501';end if;
 next_state:=jsonb_set(old.state,'{reservations}',(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(old.state->'reservations') where value->>'id'<>booking));
 insert into public.library_history values(source_lib,old.revision,old.state,old.updated_by,old.updated_at);
 update public.library_state set state=next_state,revision=old.revision+1,updated_by=auth.uid(),updated_at=now() where library_id=source_lib;
 delete from public.library_history where library_id=source_lib and revision<old.revision+1-50;return old.revision+1;
end;$$;
create or replace function public.spool_prune_booking_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.shared_bookings b where b.source_library_id=new.library_id and not exists(select 1 from jsonb_array_elements(new.state->'reservations') e where e->>'id'=b.booking_id);
 if jsonb_array_length(new.state->'reservations')+(select count(*) from public.shared_bookings where shared_library_id=new.library_id)>2000 then raise exception 'Shared booking capacity exceeded' using errcode='22023';end if;
 return new;
end;$$;
drop trigger if exists spool_booking_links_prune on public.library_state;
create trigger spool_booking_links_prune after update of state on public.library_state for each row execute function public.spool_prune_booking_links();
drop policy if exists file_read on public.library_files;
create policy file_read on public.library_files for select to authenticated using(public.spool_booking_file_allowed(library_id,booking_id,'read'));
drop policy if exists file_insert on public.library_files;
create policy file_insert on public.library_files for insert to authenticated with check(created_by=auth.uid() and public.spool_booking_file_allowed(library_id,booking_id,'files_upload'));
drop policy if exists file_delete on public.library_files;
create policy file_delete on public.library_files for delete to authenticated using(public.spool_booking_file_allowed(library_id,booking_id,'files_delete') or (created_by=auth.uid() and public.spool_booking_file_allowed(library_id,booking_id,'read') and not exists(select 1 from storage.objects o where o.bucket_id='spool-models' and o.name=object_path)));
drop policy if exists spool_object_read on storage.objects;
create policy spool_object_read on storage.objects for select to authenticated using(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_booking_file_allowed(f.library_id,f.booking_id,'read')));
drop policy if exists spool_object_insert on storage.objects;
create policy spool_object_insert on storage.objects for insert to authenticated with check(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_booking_file_allowed(f.library_id,f.booking_id,'files_upload')));
drop policy if exists spool_object_delete on storage.objects;
create policy spool_object_delete on storage.objects for delete to authenticated using(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_booking_file_allowed(f.library_id,f.booking_id,'files_delete')));
revoke execute on function public.spool_booking_link_active(uuid,text,uuid),public.get_booking_sharing(uuid,text),public.set_booking_sharing(uuid,text,uuid[]),public.get_shared_bookings(uuid),public.stop_booking_sharing(uuid,uuid,text),public.spool_booking_file_allowed(uuid,text,text),public.spool_validate_shared_booking(jsonb),public.update_shared_booking(uuid,uuid,text,integer,jsonb),public.delete_shared_booking(uuid,uuid,text,integer),public.spool_prune_booking_links() from public,anon;
grant execute on function public.spool_booking_link_active(uuid,text,uuid),public.get_booking_sharing(uuid,text),public.set_booking_sharing(uuid,text,uuid[]),public.get_shared_bookings(uuid),public.stop_booking_sharing(uuid,uuid,text),public.spool_booking_file_allowed(uuid,text,text),public.update_shared_booking(uuid,uuid,text,integer,jsonb),public.delete_shared_booking(uuid,uuid,text,integer) to authenticated;
commit;
notify pgrst, 'reload schema';
