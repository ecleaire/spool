-- Choose an owned source library instead of being limited to one's personal library.
begin;
create or replace function public.share_library_into(shared_lib uuid,source_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501'; end if;
 if not enabled then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib; return; end if;
 if source_lib=shared_lib or not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501'; end if;
 insert into public.shared_library_sources values(shared_lib,source_lib) on conflict do nothing;
end;
$$;
create or replace function public.library_is_shared(shared_lib uuid,source_lib uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_owner(source_lib) and exists(select 1 from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib);
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib),'[]'::jsonb);
end;
$$;
revoke execute on function public.share_library_into(uuid,uuid,boolean),public.library_is_shared(uuid,uuid) from public,anon;
grant execute on function public.share_library_into(uuid,uuid,boolean),public.library_is_shared(uuid,uuid) to authenticated;
commit;
