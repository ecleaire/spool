-- Event metadata is accessed exclusively by the authenticated Edge Function.
begin;
create table if not exists public.spool_event_records (
  key text primary key,
  value jsonb not null,
  revision uuid not null default gen_random_uuid()
);
alter table public.spool_event_records enable row level security;
revoke all on public.spool_event_records from public, anon, authenticated;
grant select, insert, update, delete on public.spool_event_records to service_role;
insert into storage.buckets (id,name,public)
values ('spool-event-files','spool-event-files',false)
on conflict (id) do nothing;
do $$
begin
  if exists(select 1 from storage.buckets where id='spool-event-files' and public) then
    raise exception 'Event storage bucket must be private';
  end if;
end $$;
commit;
