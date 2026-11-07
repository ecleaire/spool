-- Atomic cross-library print completion/undo. Apply after upgrade-existing.sql.
-- No service key is exposed; every affected object is authorized through the visible library.
begin;
create or replace function public.record_booking_consumption(context_lib uuid,booking_lib uuid,booking_id text,expected_revisions jsonb,allocations jsonb,request_id uuid,undo boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare booking_state public.library_state;st public.library_state;booking jsonb;record jsonb;entry jsonb;item jsonb;shared_rows jsonb;data jsonb='{}';changes jsonb='[]';allocation jsonb;libs uuid[];lib uuid;slot integer;booking_slot integer;grams numeric;remaining numeric;stock_lib uuid;stock_id text;next_booking jsonb;active boolean;
begin
 if not public.spool_member(context_lib) or not public.spool_has_permission(context_lib,'bookings_edit') then raise exception 'Booking edit permission required' using errcode='42501';end if;
 if booking_lib<>context_lib and not exists(select 1 from public.shared_bookings b where b.shared_library_id=context_lib and b.source_library_id=booking_lib and b.booking_id=record_booking_consumption.booking_id and public.spool_booking_link_active(booking_lib,record_booking_consumption.booking_id,context_lib)) then raise exception 'Active booking sharing required' using errcode='42501';end if;
 if request_id is null or jsonb_typeof(expected_revisions) is distinct from 'object' or jsonb_typeof(allocations) is distinct from 'array' or jsonb_array_length(allocations) not between 1 and 64 then raise exception 'Invalid consumption request' using errcode='22023';end if;
 for allocation in select value from jsonb_array_elements(allocations) loop
  if jsonb_typeof(allocation->'library_id') is distinct from 'string' or jsonb_typeof(allocation->'item_id') is distinct from 'string' or length(allocation->>'item_id') not between 1 and 120 or jsonb_typeof(allocation->'grams') is distinct from 'number' then raise exception 'Invalid allocation' using errcode='22023';end if;
  grams:=(allocation->>'grams')::numeric;if grams<=0 or grams>100000 or grams<>round(grams,3) then raise exception 'Invalid grams' using errcode='22023';end if;
 end loop;
 select array_agg(distinct x order by x) into libs from (select booking_lib x union select (value->>'library_id')::uuid from jsonb_array_elements(allocations)) q;
 -- A consistent lock order prevents deadlocks when booking and stock live in different libraries.
 perform 1 from public.library_state where library_id=any(libs) order by library_id for update;
 if not public.spool_has_permission(context_lib,'bookings_edit') then raise exception 'Booking edit permission required' using errcode='42501';end if;
 if booking_lib<>context_lib then
  perform 1 from public.shared_bookings b where b.shared_library_id=context_lib and b.source_library_id=booking_lib and b.booking_id=record_booking_consumption.booking_id for share;
  if not found or not public.spool_booking_link_active(booking_lib,booking_id,context_lib) then raise exception 'Active booking sharing required' using errcode='42501';end if;
 end if;
 perform 1 from public.shared_library_sources where shared_library_id=context_lib and source_library_id=any(libs) for share;
 select * into booking_state from public.library_state where library_id=booking_lib;
 select value,(ordinality-1)::integer into booking,booking_slot from jsonb_array_elements(booking_state.state->'reservations') with ordinality where value->>'id'=booking_id;
 if booking is null then raise exception 'Booking not found' using errcode='22023';end if;
 record:=booking->'filamentConsumption';active:=coalesce(record->>'status'='active',false);
 -- A response lost after commit can be retried with the same request UUID without another deduction.
 if not undo and active then
  if record->>'id'=request_id::text then
   if (select jsonb_agg(jsonb_build_object('library_id',r->>'libraryId','item_id',r->>'itemId','grams',r->'grams') order by r->>'libraryId',r->>'itemId') from jsonb_array_elements(record->'entries') r) is distinct from (select jsonb_agg(v order by v->>'library_id',v->>'item_id') from (select jsonb_build_object('library_id',a->>'library_id','item_id',a->>'item_id','grams',sum((a->>'grams')::numeric)) v from jsonb_array_elements(allocations) a group by a->>'library_id',a->>'item_id') q) then raise exception 'Recorded request differs; reload' using errcode='22023';end if;
   return jsonb_build_object('already_recorded',true);
  end if;
  raise exception 'Usage already recorded' using errcode='23505';
 end if;
 if undo then
  if record->>'id' is distinct from request_id::text then raise exception 'Consumption record not found' using errcode='22023';end if;
  if record->>'status'='reverted' then return jsonb_build_object('already_recorded',true);end if;
  if not active then raise exception 'Active record required' using errcode='22023';end if;
  -- Undo always uses the recorded allocation, never caller-supplied refund quantities.
  if (select jsonb_agg(jsonb_build_object('library_id',r->>'libraryId','item_id',r->>'itemId','grams',r->'grams') order by r->>'libraryId',r->>'itemId') from jsonb_array_elements(record->'entries') r) is distinct from (select jsonb_agg(jsonb_build_object('library_id',a->>'library_id','item_id',a->>'item_id','grams',a->'grams') order by a->>'library_id',a->>'item_id') from jsonb_array_elements(allocations) a) then raise exception 'Refund must match recorded usage' using errcode='22023';end if;
 end if;
 shared_rows:=public.get_shared_filaments(context_lib);
 for lib in select unnest(libs) loop
  select * into st from public.library_state where library_id=lib;
  if st.library_id is null or (expected_revisions->>lib::text)::integer is distinct from st.revision then raise exception 'Library changed; reload before recording' using errcode='40001';end if;
  data:=jsonb_set(data,array[lib::text],st.state);
 end loop;
 for allocation in select jsonb_build_object('library_id',value->>'library_id','item_id',value->>'item_id','grams',sum((value->>'grams')::numeric)) from jsonb_array_elements(allocations) group by value->>'library_id',value->>'item_id' loop
  stock_lib:=(allocation->>'library_id')::uuid;stock_id:=allocation->>'item_id';grams:=(allocation->>'grams')::numeric;
  if not (public.spool_has_permission(context_lib,'inventory_edit') or (not undo and public.spool_has_permission(context_lib,'inventory_use'))) then raise exception 'Stock permission required' using errcode='42501';end if;
  if stock_lib<>context_lib and not exists(select 1 from jsonb_array_elements(shared_rows) r where r->>'source_id'=stock_lib::text and r->>'source_item_id'=stock_id and case when undo then (r->>'can_edit_owned')::boolean else (r->>'can_use_owned')::boolean end) then raise exception 'Active stock sharing and permission required' using errcode='42501';end if;
  select value,(ordinality-1)::integer into item,slot from jsonb_array_elements(data->stock_lib::text->'items') with ordinality where value->>'id'=stock_id;
  if item is null or coalesce(item->>'inventoryStatus','owned')='planned' then raise exception 'Owned stock required' using errcode='22023';end if;
  remaining:=(item->>'remaining')::numeric+case when undo then grams else -grams end;
  if remaining<0 or remaining>(item->>'capacity')::numeric then raise exception 'Insufficient stock or refund exceeds capacity' using errcode='22023';end if;
  data:=jsonb_set(data,array[stock_lib::text,'items',slot::text,'remaining'],to_jsonb(remaining));
  changes:=changes||jsonb_build_array(jsonb_build_object('libraryId',stock_lib,'itemId',stock_id,'name',item->>'name','colorName',item->>'colorName','grams',grams));
 end loop;
 if undo then
  next_booking:=booking||jsonb_build_object('filamentConsumption',record||jsonb_build_object('status','reverted','revertedAt',now()));
  if coalesce(booking->>'printStatus','印刷予定')='印刷済み' then next_booking:=next_booking||jsonb_build_object('printStatus',record->>'previousStatus');end if;
 else
  record:=jsonb_build_object('id',request_id,'status','active','recordedAt',now(),'recordedBy',auth.uid(),'contextLibraryId',context_lib,'previousStatus',coalesce(booking->>'printStatus','印刷予定'),'entries',changes);
  next_booking:=booking||jsonb_build_object('printStatus','印刷済み','filamentConsumption',record);
 end if;
 if not public.spool_validate_shared_booking(next_booking) then raise exception 'Invalid booking data' using errcode='22023';end if;
 data:=jsonb_set(data,array[booking_lib::text,'reservations',booking_slot::text],next_booking);
 for lib in select unnest(libs) loop
  select * into st from public.library_state where library_id=lib;
  if octet_length((data->lib::text)::text)>10000000 then raise exception 'Library data maximum exceeded' using errcode='22023';end if;
  if data->lib::text is distinct from st.state then
   insert into public.library_history values(lib,st.revision,st.state,st.updated_by,st.updated_at);
   update public.library_state set state=data->lib::text,revision=st.revision+1,updated_by=auth.uid(),updated_at=now() where library_id=lib;
   delete from public.library_history where library_id=lib and revision<st.revision+1-50;
  end if;
 end loop;
 return jsonb_build_object('already_recorded',false,'record',next_booking->'filamentConsumption');
end;$$;
revoke all on function public.record_booking_consumption(uuid,uuid,text,jsonb,jsonb,uuid,boolean) from public,anon;
grant execute on function public.record_booking_consumption(uuid,uuid,text,jsonb,jsonb,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
