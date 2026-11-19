-- Unique display IDs. Apply in the Supabase SQL Editor as project owner.
-- No inventory/library data is changed. Existing conflicting IDs abort this transaction.
begin;
lock table auth.users in share row exclusive mode;
create table if not exists public.spool_profile_handles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check(handle ~ '^[a-z0-9_]{3,30}$')
);
alter table public.spool_profile_handles enable row level security;
revoke all on public.spool_profile_handles from public,anon,authenticated;
-- Stop rather than silently renaming an existing user's ID.
do $$ begin
 if exists(select 1 from auth.users where lower(trim(coalesce(raw_user_meta_data->>'spool_handle',''))) ~ '^[a-z0-9_]{3,30}$' group by lower(trim(raw_user_meta_data->>'spool_handle')) having count(*)>1) then
  raise exception 'SPOOL_DUPLICATE_HANDLES: Resolve existing duplicate display IDs before applying profile-handles.sql';
 end if;
end $$;
-- Reconcile the registry with auth metadata on repeat applications.
delete from public.spool_profile_handles h where not exists(select 1 from auth.users u where u.id=h.user_id and lower(trim(coalesce(u.raw_user_meta_data->>'spool_handle','')))=h.handle);
insert into public.spool_profile_handles(user_id,handle)
 select id,lower(trim(raw_user_meta_data->>'spool_handle')) from auth.users
 where lower(trim(coalesce(raw_user_meta_data->>'spool_handle',''))) ~ '^[a-z0-9_]{3,30}$'
 on conflict(user_id) do update set handle=excluded.handle;
create or replace function public.spool_enforce_profile_handle() returns trigger
language plpgsql security definer set search_path='' as $$
declare value text:=lower(trim(coalesce(new.raw_user_meta_data->>'spool_handle','')));
begin
 if value='' then delete from public.spool_profile_handles where user_id=new.id;
 else
  if value !~ '^[a-z0-9_]{3,30}$' then raise exception 'SPOOL_INVALID_HANDLE' using errcode='23514'; end if;
  begin
   insert into public.spool_profile_handles(user_id,handle) values(new.id,value)
   on conflict(user_id) do update set handle=excluded.handle;
  exception when unique_violation then raise exception 'SPOOL_HANDLE_TAKEN' using errcode='23505';
  end;
 end if;
 return new;
end $$;
revoke all on function public.spool_enforce_profile_handle() from public,anon,authenticated;
drop trigger if exists spool_unique_profile_handle on auth.users;
create trigger spool_unique_profile_handle after insert or update of raw_user_meta_data on auth.users
 for each row execute function public.spool_enforce_profile_handle();
create or replace function public.is_spool_handle_available(requested_handle text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare value text:=lower(trim(coalesce(requested_handle,'')));
begin
 if auth.uid() is null or not public.spool_allowed() then raise exception 'SPOOL account required' using errcode='42501'; end if;
 if value<>'' and value !~ '^[a-z0-9_]{3,30}$' then raise exception 'SPOOL_INVALID_HANDLE' using errcode='22023'; end if;
 return not exists(select 1 from public.spool_profile_handles where handle=value and user_id<>auth.uid());
end $$;
revoke all on function public.is_spool_handle_available(text) from public,anon;
grant execute on function public.is_spool_handle_available(text) to authenticated;
commit;
notify pgrst, 'reload schema';
