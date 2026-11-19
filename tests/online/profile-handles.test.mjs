import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '../../online/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user',true),'')::uuid$$;create function public.spool_allowed() returns boolean language sql stable as $$select coalesce(current_setting('app.allowed',true),'')='yes'$$;grant usage on schema auth to authenticated;`);
 for(const id of [a,b])await db.query('insert into auth.users values($1,$2)',[id,{spool_handle:'maker',note:'preserved'}]);
 const sql=readFileSync(new URL('../../supabase/profile-handles.sql',import.meta.url),'utf8');
 await assert.rejects(db.exec(sql),/SPOOL_DUPLICATE_HANDLES/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n,2);
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{spool_handle:'other',note:'preserved'},b]);await db.exec(sql);await db.exec(sql);
 const update=(id,handle)=>db.query("update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{spool_handle}',to_jsonb($1::text)) where id=$2",[handle,id]);
 await assert.rejects(update(b,'maker'),/SPOOL_HANDLE_TAKEN/);await assert.rejects(update(b,' MAKER '),/SPOOL_HANDLE_TAKEN/);await assert.rejects(update(b,'ab'),/SPOOL_INVALID_HANDLE/);
 assert.equal((await db.query('select raw_user_meta_data from auth.users where id=$1',[b])).rows[0].raw_user_meta_data.spool_handle,'other');
 await db.exec(`select set_config('app.user','${a}',false);select set_config('app.allowed','yes',false);set role authenticated;`);
 const available=async handle=>(await db.query('select public.is_spool_handle_available($1) as ok',[handle])).rows[0].ok;
 assert.equal(await available('MAKER'),true);assert.equal(await available('Other'),false);assert.equal(await available('new_id'),true);assert.equal(await available(''),true);
 await assert.rejects(db.query('select * from public.spool_profile_handles'),/permission denied/);await assert.rejects(db.query("insert into public.spool_profile_handles values($1,'stolen')",[a]),/permission denied/);
 await db.exec("reset role;select set_config('app.allowed','no',false);set role authenticated;");await assert.rejects(available('new_id'),/account required/);await db.exec('reset role;set role anon');await assert.rejects(available('new_id'),/permission denied/);await db.exec('reset role');
 await update(a,'');await update(b,'maker');assert.equal((await db.query("select handle from public.spool_profile_handles where user_id=$1",[b])).rows[0].handle,'maker');await db.query('delete from auth.users where id=$1',[b]);assert.equal((await db.query('select count(*)::int as n from public.spool_profile_handles')).rows[0].n,0);
 console.log('PASS: normalized unique IDs, direct auth-write enforcement, rejected duplicate migration without data loss, safe repeat migration, self/other availability, private registry, role checks and release/delete.');
}finally{await db.close()}
