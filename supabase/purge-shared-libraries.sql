-- MANUAL PRODUCTION ACTION. Never run as a migration or during app startup.
-- 1. Apply upgrade-existing.sql first.
-- 2. Review both previews below. Download any data/files you need to keep.
-- 3. Delete the listed online files via Supabase Storage UI/API (not SQL).
-- 4. Replace BOTH '未入力' values with the exact phrases stated below, then run.
-- Individual/personal libraries and their objects are excluded.
select l.id,l.name,(select count(*) from public.library_files f where f.library_id=l.id) as attachment_records
from public.libraries l where not l.personal order by l.created_at;
select o.bucket_id,o.name from storage.objects o join public.libraries l on not l.personal and left(o.name,length(l.id::text)+1)=l.id::text||'/' where o.bucket_id='spool-models';
begin;
select set_config('spool.purge_confirmation_1','未入力',true); -- 共有ライブラリをすべて削除
select set_config('spool.purge_confirmation_2','未入力',true); -- 個人ライブラリは保持
lock table public.libraries in share row exclusive mode;
do $$
begin
 if current_setting('spool.purge_confirmation_1',true) is distinct from '共有ライブラリをすべて削除' or current_setting('spool.purge_confirmation_2',true) is distinct from '個人ライブラリは保持' then raise exception 'Both deletion confirmations are required';end if;
 if to_regprocedure('public.spool_file_upload_allowed(uuid)') is null then raise exception 'Apply upgrade-existing.sql first';end if;
 perform 1 from public.libraries where not personal for update;
 if exists(select 1 from storage.objects o join public.libraries l on not l.personal and left(o.name,length(l.id::text)+1)=l.id::text||'/' where o.bucket_id='spool-models') then raise exception 'Online files remain. Remove the previewed files via Storage UI/API first. Nothing was deleted by this transaction.';end if;
 delete from public.libraries where not personal;
end;
$$;
commit;
