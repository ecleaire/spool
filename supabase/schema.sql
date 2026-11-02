-- Run once in a new Supabase project using the SQL editor (project owner).
begin;
create table public.spool_users (email text primary key check(email=lower(email)));
create table public.libraries (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 owner_id uuid not null references auth.users(id), personal boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index one_personal_library on public.libraries(owner_id) where personal;
create table public.library_members (
 library_id uuid references public.libraries(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','editor','viewer')), primary key(library_id,user_id)
);
create table public.library_invitations (
 library_id uuid references public.libraries(id) on delete cascade, email text not null check(email=lower(email)),
 role text not null check(role in ('editor','viewer')), primary key(library_id,email)
);
create table public.library_state (
 library_id uuid primary key references public.libraries(id) on delete cascade,
 state jsonb not null default '{"items":[],"customColorPresets":[],"deleted":[],"reservations":[]}',
 revision integer not null default 0, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.library_history (
 library_id uuid references public.libraries(id) on delete cascade, revision integer not null, state jsonb not null,
 updated_by uuid, updated_at timestamptz not null, primary key(library_id,revision)
);
create table public.library_files (
 id uuid primary key default gen_random_uuid(), library_id uuid not null references public.libraries(id) on delete cascade,
 booking_id text not null check(length(booking_id) between 1 and 120), name text not null check(length(name) between 1 and 240),
 object_path text unique not null, size bigint not null check(size between 1 and 104857600),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 check(object_path = library_id::text || '/' || id::text || '/model'),
 check(name ~* '\.(stl|obj|3mf|amf|step|stp|gcode)$')
);
create function public.spool_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'provider','')='google'
 and exists(select 1 from public.spool_users where email=lower(auth.jwt()->>'email'));
$$;
create function public.spool_member(lib uuid, editing boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.library_members where library_id=lib and user_id=auth.uid() and (not editing or role in ('owner','editor')));
$$;
create function public.spool_owner(lib uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.libraries where id=lib and owner_id=auth.uid());
$$;
create function public.ensure_my_library() returns uuid language plpgsql security definer set search_path='' as $$
 declare lib uuid;
 begin
 if not public.spool_allowed() then raise exception 'SPOOL invitation required' using errcode='42501'; end if;
 -- Serialize first-login creation for one account.
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 select id into lib from public.libraries where owner_id=auth.uid() and personal;
 if lib is null then
 insert into public.libraries(name,owner_id) values('マイライブラリ',auth.uid()) returning id into lib;
 insert into public.library_members values(lib,auth.uid(),'owner');
 insert into public.library_state(library_id) values(lib);
 end if;
 insert into public.library_members(library_id,user_id,role)
 select library_id,auth.uid(),role from public.library_invitations where email=lower(auth.jwt()->>'email')
 on conflict(library_id,user_id) do nothing;
 delete from public.library_invitations where email=lower(auth.jwt()->>'email');
 return lib;
 end;
$$;
create function public.invite_library_member(lib uuid, target_email text, member_role text default 'editor') returns void language plpgsql security definer set search_path='' as $$
 begin
 if not public.spool_owner(lib) then raise exception 'Owner required' using errcode='42501'; end if;
 target_email:=lower(trim(target_email));
 if length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or member_role not in ('editor','viewer') then raise exception 'Invalid invitation'; end if;
 insert into public.spool_users values(target_email) on conflict do nothing;
 insert into public.library_invitations values(lib,target_email,member_role) on conflict(library_id,email) do update set role=excluded.role;
 end;
$$;
create function public.remove_library_member(lib uuid, target_user uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not public.spool_owner(lib) then raise exception 'Owner required' using errcode='42501'; end if;
 delete from public.library_members where library_id=lib and user_id=target_user and role<>'owner';
 end;
$$;
create function public.save_library_state(lib uuid, expected_revision integer, next_state jsonb) returns integer language plpgsql security definer set search_path='' as $$
 declare old public.library_state; next_revision integer;
 begin
 if not public.spool_member(lib,true) then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(next_state)<>'object' or not (next_state ?& array['items','reservations','customColorPresets','deleted'])
 or jsonb_typeof(next_state->'items')<>'array' or jsonb_typeof(next_state->'reservations')<>'array'
 or jsonb_typeof(next_state->'customColorPresets')<>'array' or jsonb_typeof(next_state->'deleted')<>'array'
 or octet_length(next_state::text)>10000000 then raise exception 'Invalid library data (10 MB maximum)'; end if;
 select * into old from public.library_state where library_id=lib for update;
 if old.revision is distinct from expected_revision then raise exception 'Library changed; reload before saving' using errcode='40001'; end if;
 insert into public.library_history values(lib,old.revision,old.state,old.updated_by,old.updated_at);
 next_revision:=old.revision+1;
 update public.library_state set state=next_state,revision=next_revision,updated_by=auth.uid(),updated_at=now() where library_id=lib;
 delete from public.library_history where library_id=lib and revision < next_revision-50;
 return next_revision;
 end;
$$;
-- No direct writes to memberships, invitations, state or history.
alter table public.spool_users enable row level security;
alter table public.libraries enable row level security;
alter table public.library_members enable row level security;
alter table public.library_invitations enable row level security;
alter table public.library_state enable row level security;
alter table public.library_history enable row level security;
alter table public.library_files enable row level security;
create policy library_read on public.libraries for select to authenticated using(public.spool_member(id));
create policy member_read on public.library_members for select to authenticated using(public.spool_member(library_id));
create policy invitation_read on public.library_invitations for select to authenticated using(public.spool_owner(library_id));
create policy invitation_cancel on public.library_invitations for delete to authenticated using(public.spool_owner(library_id));
create policy state_read on public.library_state for select to authenticated using(public.spool_member(library_id));
create policy history_read on public.library_history for select to authenticated using(public.spool_member(library_id));
create policy file_read on public.library_files for select to authenticated using(public.spool_member(library_id));
create policy file_insert on public.library_files for insert to authenticated with check(public.spool_member(library_id,true) and created_by=auth.uid());
create policy file_delete on public.library_files for delete to authenticated using(public.spool_member(library_id,true));
revoke all on public.spool_users,public.libraries,public.library_members,public.library_invitations,public.library_state,public.library_history,public.library_files from anon,authenticated;
grant select on public.libraries,public.library_members,public.library_invitations,public.library_state,public.library_history,public.library_files to authenticated;
grant delete on public.library_invitations to authenticated;
grant insert,delete on public.library_files to authenticated;
revoke execute on function public.spool_allowed(),public.spool_member(uuid,boolean),public.spool_owner(uuid),public.ensure_my_library(),public.invite_library_member(uuid,text,text),public.remove_library_member(uuid,uuid),public.save_library_state(uuid,integer,jsonb) from public,anon;
grant execute on function public.spool_allowed(),public.spool_member(uuid,boolean),public.spool_owner(uuid),public.ensure_my_library(),public.invite_library_member(uuid,text,text),public.remove_library_member(uuid,uuid),public.save_library_state(uuid,integer,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('spool-models','spool-models',false,104857600,array['application/octet-stream','model/stl','application/sla','model/obj','text/plain','application/zip','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml']);
-- Policies compare text instead of casting arbitrary object names to UUID.
create policy spool_object_read on storage.objects for select to authenticated using(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_member(f.library_id)));
create policy spool_object_insert on storage.objects for insert to authenticated with check(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_member(f.library_id,true)));
create policy spool_object_delete on storage.objects for delete to authenticated using(bucket_id='spool-models' and exists(select 1 from public.library_files f where f.object_path=storage.objects.name and public.spool_member(f.library_id,true)));
commit;
