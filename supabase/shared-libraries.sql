-- Existing installations: run once in SQL Editor. Safe to reapply.
begin;
create or replace function public.create_shared_library(library_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if not public.spool_allowed() then raise exception 'SPOOL invitation required' using errcode='42501'; end if;
 library_name:=trim(coalesce(library_name,''));
 if length(library_name) not between 1 and 80 then raise exception 'Invalid library name'; end if;
 insert into public.libraries(name,owner_id,personal) values(library_name,auth.uid(),false) returning id into new_id;
 insert into public.library_members(library_id,user_id,role) values(new_id,auth.uid(),'owner');
 insert into public.library_state(library_id) values(new_id);
 return new_id;
end;
$$;
revoke execute on function public.create_shared_library(text) from public,anon;
grant execute on function public.create_shared_library(text) to authenticated;
commit;
