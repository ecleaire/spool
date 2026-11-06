-- Owner-only summary. Does not expose member identities or private booking contents.
begin;
create or replace function public.get_booking_sharing_summary(source_lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) or not exists(select 1 from public.libraries where id=source_lib and personal) then raise exception 'Personal library owner required' using errcode='42501';end if;
 return jsonb_build_object('personal_has_members',exists(select 1 from public.library_members where library_id=source_lib and user_id<>auth.uid()),'personal_has_invites',exists(select 1 from public.library_invitations where library_id=source_lib),'bookings',coalesce((select jsonb_agg(jsonb_build_object('booking_id',g.booking_id,'targets',g.targets)) from (
 select b.booking_id,jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'active',public.spool_booking_link_active(source_lib,b.booking_id,l.id)) order by l.name) targets from public.shared_bookings b join public.libraries l on l.id=b.shared_library_id where b.source_library_id=source_lib group by b.booking_id
 ) g),'[]'::jsonb));
end;$$;
revoke execute on function public.get_booking_sharing_summary(uuid) from public,anon;
grant execute on function public.get_booking_sharing_summary(uuid) to authenticated;
commit;
notify pgrst,'reload schema';
