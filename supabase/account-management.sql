-- Add to an existing SPOOL database. No existing account is promoted automatically.
begin;
create table if not exists public.spool_admins (
 email text primary key references public.spool_users(email) on delete cascade,
 check(email=lower(email))
);
alter table public.spool_admins enable row level security;
revoke all on public.spool_admins from public,anon,authenticated;
create or replace function public.spool_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select public.spool_allowed() and exists(select 1 from public.spool_admins where email=lower(auth.jwt()->>'email'));
$$;
create or replace function public.allow_spool_account(target_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 target_email:=lower(trim(coalesce(target_email,'')));
 if length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 insert into public.spool_users(email) values(target_email) on conflict do nothing;
end;
$$;
create or replace function public.grant_spool_admin(target_email text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.spool_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 target_email:=lower(trim(coalesce(target_email,'')));
 perform public.allow_spool_account(target_email);
 insert into public.spool_admins(email) values(target_email) on conflict do nothing;
end;
$$;
revoke execute on function public.grant_spool_admin(text) from public,anon;
grant execute on function public.grant_spool_admin(text) to authenticated;
revoke execute on function public.spool_is_admin(),public.allow_spool_account(text) from public,anon;
grant execute on function public.spool_is_admin(),public.allow_spool_account(text) to authenticated;
commit;
