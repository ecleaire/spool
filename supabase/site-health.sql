-- Read-only diagnostics. No library state, memberships or member-operation grants are changed.
begin;
create or replace function public.get_spool_feature_support(lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; sample jsonb; printing boolean:=false;
begin
 if auth.uid() is null or not public.spool_member(lib) then raise exception 'Library membership required' using errcode='42501';end if;
 result:=jsonb_build_object(
  'filament_sharing',to_regprocedure('public.set_filament_sharing(uuid,uuid,text,text[],text[])') is not null and to_regprocedure('public.get_filament_sharing(uuid)') is not null,
  'booking_sharing',to_regprocedure('public.set_booking_sharing(uuid,text,uuid[])') is not null and to_regprocedure('public.get_shared_bookings(uuid)') is not null,
  'shared_edit',to_regprocedure('public.update_shared_filament(uuid,uuid,text,integer,jsonb)') is not null,
  'consumption',to_regprocedure('public.record_booking_consumption(uuid,uuid,text,jsonb,jsonb,uuid,boolean)') is not null,
  'booking_progress_deletion',to_regprocedure('public.supports_booking_progress_deletion()') is not null,
  'booking_deletion',to_regprocedure('public.delete_booking_content(uuid,uuid,text,integer,text)') is not null,
  'permissions',to_regprocedure('public.get_my_library_permissions(uuid)') is not null and to_regprocedure('public.set_library_member_permissions(uuid,uuid,text,jsonb)') is not null);
 if to_regprocedure('public.spool_validate_shared_booking(jsonb)') is not null then
  sample:='{"id":"diagnostic","title":"test","registeredDate":"2026-11-01","deadline":"","weekday":"日","className":"","desiredColor":"none","color":"#808080","printMinutes":1,"printStatus":"印刷途中"}'::jsonb;
  execute 'select public.spool_validate_shared_booking($1)' into printing using sample;
 end if;
 return jsonb_build_object('version',1,'checked_at',now(),'features',result||jsonb_build_object('printing_status',coalesce(printing,false)));
end;$$;
revoke all on function public.get_spool_feature_support(uuid) from public,anon;
grant execute on function public.get_spool_feature_support(uuid) to authenticated;
commit;
notify pgrst, 'reload schema';
