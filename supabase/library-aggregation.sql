-- Apply after shared-libraries.sql. Does not enable any sharing automatically.
begin;
create table if not exists public.shared_library_sources (
 shared_library_id uuid references public.libraries(id) on delete cascade,
 source_library_id uuid references public.libraries(id) on delete cascade,
 primary key(shared_library_id,source_library_id),check(shared_library_id<>source_library_id)
);
alter table public.shared_library_sources enable row level security;
revoke all on public.shared_library_sources from public,anon,authenticated;
create or replace function public.share_my_filaments(shared_lib uuid, enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare source_id uuid;
begin
 if not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501'; end if;
 select id into source_id from public.libraries where owner_id=auth.uid() and personal;
 if source_id is null then raise exception 'Personal library required'; end if;
 if enabled then insert into public.shared_library_sources values(shared_lib,source_id) on conflict do nothing;
 else delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_id; end if;
end;
$$;
create or replace function public.my_filaments_shared(shared_lib uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_member(shared_lib) and exists(select 1 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id where s.shared_library_id=shared_lib and l.owner_id=auth.uid());
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id and l.personal
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib),'[]'::jsonb);
end;
$$;
revoke execute on function public.share_my_filaments(uuid,boolean),public.my_filaments_shared(uuid),public.get_shared_filaments(uuid) from public,anon;
grant execute on function public.share_my_filaments(uuid,boolean),public.my_filaments_shared(uuid),public.get_shared_filaments(uuid) to authenticated;
commit;
