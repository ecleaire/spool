-- Adds a library-scoped UI operation grant. Existing member records are retained.
-- Library members still share the same data viewing scope; this controls the organizer tool.
begin;
create or replace function public.spool_permission_keys() returns text[] language sql immutable set search_path='' as $$
 select array['inventory_create','inventory_edit','inventory_delete','inventory_use','bookings_create','bookings_edit','bookings_delete','files_upload','files_delete','sharing_manage','purchase_create','purchase_edit','wishlist_create','wishlist_edit','files_organize'];
$$;
create or replace function public.supports_attachment_organizer() returns boolean language sql stable set search_path='' as $$select 'files_organize'=any(public.spool_permission_keys())$$;
revoke all on function public.spool_permission_keys(),public.supports_attachment_organizer() from public,anon;
grant execute on function public.spool_permission_keys(),public.supports_attachment_organizer() to authenticated;
notify pgrst,'reload schema';
commit;
