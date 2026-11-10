-- Apply after upgrade-existing.sql (or the current booking-sharing/account-access migrations).
-- Deletes booking/attachment references only. Original Storage objects and local files are retained.
begin;
create or replace function public.delete_booking_content(context_lib uuid,source_lib uuid,booking text,expected_revision integer,attachment_id text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare old public.library_state;entry jsonb;updated jsonb;next_bookings jsonb;next_revision integer;
begin
 if context_lib is null or source_lib is null or booking is null or length(booking) not between 1 and 120 or expected_revision is null or (attachment_id is not null and length(attachment_id) not between 1 and 120) then raise exception 'Invalid deletion request' using errcode='22023';end if;
 if not public.spool_member(context_lib) or not(public.spool_has_permission(context_lib,'bookings_create') or public.spool_has_permission(context_lib,case when attachment_id is null then 'bookings_delete' else 'files_delete' end)) then raise exception 'Booking deletion permission required' using errcode='42501';end if;
 if source_lib<>context_lib and (not exists(select 1 from public.shared_bookings where source_library_id=source_lib and booking_id=booking and shared_library_id=context_lib) or not public.spool_booking_link_active(source_lib,booking,context_lib)) then raise exception 'Explicit booking sharing required' using errcode='42501';end if;
 perform 1 from public.libraries where id=source_lib for update;
 if not found then raise exception 'Library not found' using errcode='22023';end if;
 select * into old from public.library_state where library_id=source_lib for update;
 if not found then raise exception 'Library state not found' using errcode='22023';end if;
 if source_lib<>context_lib then
  perform 1 from public.shared_bookings where source_library_id=source_lib and booking_id=booking and shared_library_id=context_lib for share;
  if not found or not public.spool_booking_link_active(source_lib,booking,context_lib) then raise exception 'Explicit booking sharing required' using errcode='42501';end if;
 end if;
 if old.revision is distinct from expected_revision then raise exception 'Library changed; reload before deleting' using errcode='40001';end if;
 select value into entry from jsonb_array_elements(old.state->'reservations') where value->>'id'=booking;
 if entry is null then raise exception 'Booking not found' using errcode='22023';end if;
 if attachment_id is null and not public.spool_has_permission(context_lib,'bookings_create') and jsonb_array_length(coalesce(entry->'attachments','[]'::jsonb))>0 and not public.spool_has_permission(context_lib,'files_delete') then raise exception 'File deletion permission required' using errcode='42501';end if;
 if attachment_id is not null then
  if not exists(select 1 from jsonb_array_elements(coalesce(entry->'attachments','[]'::jsonb)) f where f->>'id'=attachment_id) then raise exception 'Attachment not found' using errcode='22023';end if;
  updated=jsonb_set(entry,'{attachments}',coalesce((select jsonb_agg(f order by n) from jsonb_array_elements(entry->'attachments') with ordinality t(f,n) where f->>'id'<>attachment_id),'[]'::jsonb));
  if entry ? 'modelColors' then updated=jsonb_set(updated,'{modelColors}',coalesce((select jsonb_agg(c order by n) from jsonb_array_elements(entry->'modelColors') with ordinality t(c,n) where not(c->>'kind'='attachment' and c->>'id'=attachment_id)),'[]'::jsonb));end if;
  if exists(select 1 from jsonb_array_elements(coalesce(entry->'filamentUsage'->'plates','[]'::jsonb)) p where p->>'attachmentId'=attachment_id) then updated=jsonb_set(updated,'{filamentUsage}','null'::jsonb);end if;
  select coalesce(jsonb_agg(case when b->>'id'=booking then updated else b end order by n),'[]'::jsonb) into next_bookings from jsonb_array_elements(old.state->'reservations') with ordinality t(b,n);
 else
  select coalesce(jsonb_agg(b order by n),'[]'::jsonb) into next_bookings from jsonb_array_elements(old.state->'reservations') with ordinality t(b,n) where b->>'id'<>booking;
  delete from public.shared_bookings where source_library_id=source_lib and booking_id=booking;
 end if;
 insert into public.library_history values(source_lib,old.revision,old.state,old.updated_by,old.updated_at);
 next_revision=old.revision+1;
 update public.library_state set state=jsonb_set(old.state,'{reservations}',next_bookings),revision=next_revision,updated_by=auth.uid(),updated_at=now() where library_id=source_lib;
 delete from public.library_history where library_id=source_lib and revision<next_revision-50;
 return next_revision;
end;$$;
revoke all on function public.delete_booking_content(uuid,uuid,text,integer,text) from public,anon;
grant execute on function public.delete_booking_content(uuid,uuid,text,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
