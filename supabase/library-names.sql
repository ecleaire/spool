-- Existing databases: safe to reapply.
begin;
create or replace function public.rename_spool_library(lib uuid, library_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(lib) then raise exception 'Owner required' using errcode='42501'; end if;
 library_name:=trim(coalesce(library_name,''));
 if length(library_name) not between 1 and 80 then raise exception 'Invalid library name'; end if;
 update public.libraries set name=library_name where id=lib;
end;
$$;
revoke execute on function public.rename_spool_library(uuid,text) from public,anon;
grant execute on function public.rename_spool_library(uuid,text) to authenticated;
commit;
