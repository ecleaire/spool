-- Apply after library-combination.sql. Existing full-library sharing is preserved.
begin;
alter table public.shared_library_sources add column if not exists share_mode text not null default 'all' check(share_mode in ('all','selected'));
alter table public.shared_library_sources add column if not exists included_ids text[] not null default '{}';
alter table public.shared_library_sources add column if not exists excluded_ids text[] not null default '{}';

create or replace function public.set_filament_sharing(shared_lib uuid,source_lib uuid,sharing_mode text,item_ids text[] default '{}',excluded_item_ids text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501'; end if;
 if sharing_mode='none' then delete from public.shared_library_sources where shared_library_id=shared_lib and source_library_id=source_lib;return;end if;
 if source_lib=shared_lib or not public.spool_member(shared_lib,true) or not exists(select 1 from public.libraries where id=shared_lib and not personal) then raise exception 'Shared library editor required' using errcode='42501';end if;
 if sharing_mode is null or sharing_mode not in ('all','selected') or item_ids is null or cardinality(item_ids)>5000 or excluded_item_ids is null or cardinality(excluded_item_ids)>5000 or exists(select 1 from unnest(excluded_item_ids) id where id is null or length(id)>120 or length(id)=0) or exists(select 1 from unnest(item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 if sharing_mode='selected' and exists(select 1 from unnest(item_ids) id where not exists(select 1 from public.library_state st cross join lateral jsonb_array_elements(st.state->'items') e where st.library_id=source_lib and e->>'id'=id)) then raise exception 'Unknown source filament' using errcode='22023';end if;
 insert into public.shared_library_sources(shared_library_id,source_library_id,share_mode,included_ids,excluded_ids)
 values(shared_lib,source_lib,sharing_mode,case when sharing_mode='selected' then array(select distinct unnest(item_ids)) else '{}'::text[] end,case when sharing_mode='all' then array(select distinct unnest(excluded_item_ids)) else '{}'::text[] end)
 on conflict(shared_library_id,source_library_id) do update set share_mode=excluded.share_mode,included_ids=excluded.included_ids,excluded_ids=excluded.excluded_ids;
end;
$$;
create or replace function public.get_filament_sharing(source_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_owner(source_lib) then raise exception 'Source library owner required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('shared_library_id',s.shared_library_id,'shared_library_name',l.name,'mode',s.share_mode,'active',public.spool_member(s.shared_library_id,true),'included_ids',s.included_ids,'excluded_ids',s.excluded_ids)) from public.shared_library_sources s join public.libraries l on l.id=s.shared_library_id where s.source_library_id=source_lib),'[]'::jsonb);
end;
$$;
create or replace function public.stop_shared_filaments(shared_lib uuid,source_lib uuid,item_ids text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not (public.spool_owner(source_lib) or public.spool_owner(shared_lib)) then raise exception 'Source or shared library owner required' using errcode='42501';end if;
 if item_ids is null or cardinality(item_ids)=0 or cardinality(item_ids)>5000 or exists(select 1 from unnest(item_ids) id where id is null or length(id)>120 or length(id)=0) then raise exception 'Invalid sharing selection' using errcode='22023';end if;
 update public.shared_library_sources set included_ids=array(select unnest(included_ids) except select unnest(item_ids)),excluded_ids=case when share_mode='all' then array(select distinct unnest(excluded_ids||item_ids)) else excluded_ids end where shared_library_id=shared_lib and source_library_id=source_lib;
end;
$$;
create or replace function public.get_shared_filaments(shared_lib uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.spool_member(shared_lib) then raise exception 'Member required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('source_id',l.id,'source_name',l.name,'source_item_id',entry.value->>'id','can_stop',public.spool_owner(l.id) or public.spool_owner(shared_lib),'item',entry.value))
 from public.shared_library_sources s join public.libraries l on l.id=s.source_library_id
 join public.library_state st on st.library_id=l.id
 join public.library_members m on m.library_id=s.shared_library_id and m.user_id=l.owner_id and m.role in ('owner','editor')
 cross join lateral jsonb_array_elements(st.state->'items') entry
 where s.shared_library_id=shared_lib and ((s.share_mode='all' and not (entry.value->>'id'=any(s.excluded_ids))) or (s.share_mode='selected' and entry.value->>'id'=any(s.included_ids)))),'[]'::jsonb);
end;
$$;
-- Legacy enable operations explicitly select full, future-inclusive sharing.
create or replace function public.share_library_into(shared_lib uuid,source_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.set_filament_sharing(shared_lib,source_lib,case when enabled then 'all' else 'none' end,'{}');
end;
$$;
create or replace function public.share_my_filaments(shared_lib uuid,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare source_id uuid;
begin
 select id into source_id from public.libraries where owner_id=auth.uid() and personal;
 if source_id is null then raise exception 'Personal library required';end if;
 perform public.set_filament_sharing(shared_lib,source_id,case when enabled then 'all' else 'none' end,'{}');
end;
$$;
revoke execute on function public.set_filament_sharing(uuid,uuid,text,text[],text[]),public.get_filament_sharing(uuid),public.stop_shared_filaments(uuid,uuid,text[]) from public,anon;
grant execute on function public.set_filament_sharing(uuid,uuid,text,text[],text[]),public.get_filament_sharing(uuid),public.stop_shared_filaments(uuid,uuid,text[]) to authenticated;
commit;
