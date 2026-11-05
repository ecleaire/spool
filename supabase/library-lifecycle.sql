-- Apply after library-administrators.sql. No library is deleted by this migration.
begin;
create or replace function public.spool_file_upload_allowed(lib uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for key share;
 if not found then return false;end if;
 return public.spool_has_permission(lib,'files_upload');
end;
$$;
drop policy if exists file_insert on public.library_files;
create policy file_insert on public.library_files for insert to authenticated with check(public.spool_file_upload_allowed(library_id) and created_by=auth.uid());
drop policy if exists spool_object_insert on storage.objects;
create policy spool_object_insert on storage.objects for insert to authenticated with check(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_file_upload_allowed(f.library_id)));
create or replace function public.get_shared_library_deletion_info(lib uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.spool_owner(lib) then raise exception 'Host required' using errcode='42501';end if;
 select jsonb_build_object('name',l.name,'revision',s.revision,'object_paths',coalesce((select jsonb_agg(f.object_path) from public.library_files f where f.library_id=lib),'[]'::jsonb)) into result from public.libraries l join public.library_state s on s.library_id=l.id where l.id=lib and not l.personal;
 if result is null then raise exception 'Shared library required' using errcode='22023';end if;
 return result;
end;
$$;
create or replace function public.delete_shared_library(lib uuid,confirmation_name text,expected_revision integer,confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.libraries;
begin
 select * into target from public.libraries where id=lib for update;
 if not found or not public.spool_owner(lib) then raise exception 'Host required' using errcode='42501';end if;
 if target.personal then raise exception 'Personal library cannot be deleted' using errcode='22023';end if;
 if confirmed is distinct from true or confirmation_name is distinct from target.name then raise exception 'Two-stage confirmation required' using errcode='22023';end if;
 if (select revision from public.library_state where library_id=lib) is distinct from expected_revision then raise exception 'Library changed; reload before deleting' using errcode='40001';end if;
 if exists(select 1 from storage.objects where bucket_id='spool-models' and left(name,length(lib::text)+1)=lib::text||'/') then raise exception 'Storage files remain; remove using Storage API before deleting' using errcode='55000';end if;
 delete from public.libraries where id=lib;
end;
$$;
create or replace function public.leave_shared_library(lib uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.libraries where id=lib for update;
 if not public.spool_member(lib) then raise exception 'Member required' using errcode='42501';end if;
 if not exists(select 1 from public.libraries where id=lib and not personal) then raise exception 'Shared library required' using errcode='22023';end if;
 if public.spool_owner(lib) then raise exception 'Host cannot leave; delete the shared library instead' using errcode='42501';end if;
 delete from public.shared_library_sources s using public.libraries l where s.shared_library_id=lib and s.source_library_id=l.id and l.owner_id=auth.uid();
 delete from public.library_invitations where library_id=lib and email=lower(auth.jwt()->>'email');
 delete from public.library_members where library_id=lib and user_id=auth.uid();
end;
$$;
revoke execute on function public.spool_file_upload_allowed(uuid),public.get_shared_library_deletion_info(uuid),public.delete_shared_library(uuid,text,integer,boolean),public.leave_shared_library(uuid) from public,anon;
grant execute on function public.spool_file_upload_allowed(uuid),public.get_shared_library_deletion_info(uuid),public.delete_shared_library(uuid,text,integer,boolean),public.leave_shared_library(uuid) to authenticated;
commit;
