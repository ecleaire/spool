-- SPOOL reservation filament estimates. Existing inventory/reservations are preserved.
begin;
-- Pure validation of optional reservation estimates. No data or permissions are changed.
create or replace function public.spool_validate_filament_usage(u jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare f jsonb;k text;
begin
 if u='null'::jsonb then return true;end if;
 if jsonb_typeof(u) is distinct from 'object' or jsonb_typeof(u->'filaments') is distinct from 'array' or jsonb_array_length(u->'filaments')>64 then return false;end if;
 for k in select unnest(array['grams','millimeters']) loop
  if not(u ? k) or (u->k<>'null'::jsonb and (jsonb_typeof(u->k) is distinct from 'number' or (u->>k)::numeric not between 0 and 1000000000)) then return false;end if;
 end loop;
 for f in select value from jsonb_array_elements(u->'filaments') loop
  if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'type') is distinct from 'string' or length(f->>'type')>40 or jsonb_typeof(f->'color') is distinct from 'string' or ((f->>'color')<>'' and (f->>'color') !~ '^#[0-9A-Fa-f]{6}$') then return false;end if;
  for k in select unnest(array['grams','millimeters']) loop
   if not(f ? k) or (f->k<>'null'::jsonb and (jsonb_typeof(f->k) is distinct from 'number' or (f->>k)::numeric not between 0 and 1000000000)) then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;$$;

create or replace function public.spool_validate_shared_booking(b jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare entry jsonb;path text;date_value date;
begin
 if jsonb_typeof(b)<>'object' or jsonb_typeof(b->'id') is distinct from 'string' or length(b->>'id') not between 1 and 120 or jsonb_typeof(b->'title') is distinct from 'string' or length(trim(b->>'title')) not between 1 and 100 or jsonb_typeof(b->'desiredColor') is distinct from 'string' or length(trim(b->>'desiredColor')) not between 1 and 200 or coalesce(b->>'color','') !~ '^#[0-9A-Fa-f]{6}$' then return false;end if;
 if coalesce(b->>'registeredDate','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(b->>'weekday','') not in ('月','火','水','木','金','土','日') or b->>'className' is null or b->>'className' not in ('','A2','A3','EX') or b->>'deadline' is null then return false;end if;
 date_value:=(b->>'registeredDate')::date;if to_char(date_value,'YYYY-MM-DD')<>b->>'registeredDate' then return false;end if;
 if b->>'deadline'<>'' and (b->>'deadline' !~ '^\d{4}-\d{2}-\d{2}$' or to_char((b->>'deadline')::date,'YYYY-MM-DD')<>b->>'deadline' or (b->>'deadline')::date<date_value) then return false;end if;
 if jsonb_typeof(b->'printMinutes') is distinct from 'number' or (b->>'printMinutes')::numeric not between 1 and 60000 or floor((b->>'printMinutes')::numeric)<>(b->>'printMinutes')::numeric then return false;end if;
 if b ? 'filamentUsage' and not public.spool_validate_filament_usage(b->'filamentUsage') then return false;end if;
 if b ? 'registeredTime' and (jsonb_typeof(b->'registeredTime')<>'string' or b->>'registeredTime' !~ '^([01]\d|2[0-3]):[0-5]\d$') then return false;end if;
 if b ? 'creator' and (jsonb_typeof(b->'creator')<>'string' or length(b->>'creator')>100) then return false;end if;
 if b ? 'quality' and (jsonb_typeof(b->'quality') is distinct from 'string' or b->>'quality' not in ('speed','standard','fine')) then return false;end if;
 if b ? 'printStatus' and (jsonb_typeof(b->'printStatus') is distinct from 'string' or b->>'printStatus' not in ('印刷予定','印刷途中','印刷済み','未定')) then return false;end if;
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
 if changes is null or jsonb_typeof(changes)<>'object' or exists(select 1 from jsonb_object_keys(changes) k where k not in ('title','creator','registeredDate','registeredTime','weekday','className','quality','requestedFilaments','filamentUsage','modelColors','printStatus','desiredColor','color','colorPreference','colorTranslucent','printMinutes','deadline','tags','files','attachments')) then raise exception 'Invalid booking changes' using errcode='22023';end if;
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
revoke execute on function public.update_shared_booking(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function public.update_shared_booking(uuid,uuid,text,integer,jsonb) to authenticated;
commit;
notify pgrst, 'reload schema';
