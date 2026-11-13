-- Accept the additional print status without changing data, policies or grants.
-- Run once in the existing project's SQL Editor; safe to run again.
begin;
do $$
declare fn regprocedure; definition text; updated text;
begin
 fn:=to_regprocedure('public.spool_validate_shared_booking(jsonb)');
 if fn is null then raise exception 'Apply booking-sharing.sql before booking-printing-status.sql';end if;
 definition:=pg_get_functiondef(fn);
 updated:=replace(definition,'''印刷予定'',''印刷済み'',''未定''','''印刷予定'',''印刷途中'',''印刷済み'',''未定''');
 if updated=definition and position('''印刷予定'',''印刷途中'',''印刷済み'',''未定''' in definition)=0 then
  raise exception 'Unexpected booking validator; review before applying';
 end if;
 if updated<>definition then execute updated;end if;
end;$$;
commit;
notify pgrst, 'reload schema';
