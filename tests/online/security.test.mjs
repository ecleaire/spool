import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '../../online/node_modules/@electric-sql/pglite/dist/index.js';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
const state={items:[],deleted:[],reservations:[],customColorPresets:[]};
test('SQL enforces invitations, tenant isolation, owner privileges, CAS, history and private file access',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'$$;
 ` .replace("select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'","select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid"));
 await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,public,storage to authenticated,anon;
 grant execute on all functions in schema auth to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,delete on storage.objects to authenticated;
 `);
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);
 await db.exec(readFileSync(new URL('../../supabase/schema.sql',import.meta.url),'utf8'));
 await db.query("insert into public.spool_users values('owner@example.com')");
 async function as(index,email,fn,provider='google'){
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[index],email,app_metadata:{provider}})]);
  try{return await fn()}finally{await db.exec('reset role')}
 }
 const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
 let mine,shared;
 await as(0,'owner@example.com',async()=>{
  mine=(await scalar('select public.ensure_my_library() as id')).id;
  assert.equal((await scalar('select public.ensure_my_library() as id')).id,mine);
  await db.query("select public.invite_library_member($1,'editor@example.com','editor')",[mine]);
  await db.query("select public.invite_library_member($1,'viewer@example.com','viewer')",[mine]);
 });
 await as(3,'stranger@example.com',async()=>{
  assert.equal((await db.query('select * from public.library_state')).rows.length,0);
  await assert.rejects(db.query('select public.ensure_my_library()'),/invitation required/);
  await assert.rejects(db.query("select public.save_library_state($1,0,$2)",[mine,state]),/Editor required/);
 });
 await as(1,'editor@example.com',async()=>{
  shared=(await scalar('select public.ensure_my_library() as id')).id;assert.notEqual(shared,mine);
  assert.equal((await db.query('select * from public.libraries')).rows.length,2);
  assert.equal((await scalar('select public.save_library_state($1,0,$2) as revision',[mine,state])).revision,1);
  await assert.rejects(db.query('select public.save_library_state($1,0,$2)',[mine,state]),/Library changed/);
  assert.equal((await db.query('select * from public.library_history where library_id=$1',[mine])).rows.length,1);
  await assert.rejects(db.query("select public.invite_library_member($1,'bad@example.com','editor')",[mine]),/Owner required/);
  await assert.rejects(db.query("update public.library_members set role='owner'"),/permission denied/);
  await assert.rejects(db.query('update public.library_state set revision=99'),/permission denied/);
 });
 const fileId='55555555-5555-4555-8555-555555555555',filePath=`${mine}/${fileId}/model`;
 await as(0,'owner@example.com',async()=>{
  // Owner's personal library cannot read the editor's private library.
  assert.equal((await db.query('select * from public.library_state where library_id=$1',[shared])).rows.length,0);
  await db.query("insert into public.library_files(id,library_id,booking_id,name,object_path,size) values($1,$2,'booking-1','part.3mf',$3,100)",[fileId,mine,filePath]);
  await db.query("insert into storage.objects(bucket_id,name) values('spool-models',$1)",[filePath]);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('spool-models','arbitrary/path')"),/row-level security/);
 });
 await as(2,'viewer@example.com',async()=>{
  await db.query('select public.ensure_my_library()');
  assert.equal((await db.query('select * from storage.objects')).rows.length,1);
  await assert.rejects(db.query('select public.save_library_state($1,1,$2)',[mine,state]),/Editor required/);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('spool-models',$1)",[filePath]),/row-level security/);
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
 });
 await as(3,'stranger@example.com',async()=>{assert.equal((await db.query('select * from storage.objects')).rows.length,0)});
 await as(0,'owner@example.com',async()=>{await db.query('select public.remove_library_member($1,$2)',[mine,ids[1]])});
 await as(1,'editor@example.com',async()=>{
  await db.query('select public.ensure_my_library()');
  assert.equal((await db.query('select * from public.library_state where library_id=$1',[mine])).rows.length,0);
  await assert.rejects(db.query('select public.save_library_state($1,1,$2)',[mine,state]),/Editor required/);
 });
 await as(0,'owner@example.com',async()=>{await assert.rejects(db.query('select public.ensure_my_library()'),/invitation required/)},'email');
 // Account-only grants require a separately provisioned administrator, never library ownership alone.
 await db.exec(readFileSync(new URL('../../supabase/account-management.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/account-management.sql',import.meta.url),'utf8'));
 await as(0,'owner@example.com',async()=>{assert.equal((await scalar('select public.spool_is_admin() as yes')).yes,false);await assert.rejects(db.query("select public.allow_spool_account('new@example.com')"),/Administrator required/);await assert.rejects(db.query("insert into public.spool_admins values('owner@example.com')"),/permission denied/);await assert.rejects(db.query("select public.grant_spool_admin('owner@example.com')"),/Administrator required/);});
 await db.query("insert into public.spool_admins values('owner@example.com')");
 await as(0,'owner@example.com',async()=>{assert.equal((await scalar('select public.spool_is_admin() as yes')).yes,true);await db.query("select public.allow_spool_account(' New@Example.com ')");await db.query("select public.allow_spool_account('new@example.com')");await assert.rejects(db.query("select public.allow_spool_account(null)"),/Invalid email/);await assert.rejects(db.query("select public.allow_spool_account('not-an-email')"),/Invalid email/);});
 assert.equal((await db.query("select * from public.spool_users where email='new@example.com'")).rows.length,1);assert.equal((await db.query("select * from public.library_invitations where email='new@example.com'")).rows.length,0);
 await as(1,'editor@example.com',async()=>{await assert.rejects(db.query("select public.allow_spool_account('bad@example.com')"),/Administrator required/);await assert.rejects(db.query('select * from public.spool_admins'),/permission denied/);});
 await as(0,'owner@example.com',async()=>{await assert.rejects(db.query("select public.allow_spool_account('bad@example.com')"),/Administrator required/)},'email');
 await as(0,'owner@example.com',async()=>{await db.query("select public.grant_spool_admin('editor@example.com')");});
 await as(1,'editor@example.com',async()=>{assert.equal((await scalar('select public.spool_is_admin() as yes')).yes,true);await db.query("select public.grant_spool_admin('nextadmin@example.com')");assert.equal((await db.query('select * from public.library_state where library_id=$1',[mine])).rows.length,0);});
 assert.equal((await db.query("select * from public.spool_admins where email='nextadmin@example.com'")).rows.length,1);
 await db.exec(readFileSync(new URL('../../supabase/shared-libraries.sql',import.meta.url),'utf8'));let team;
 await as(0,'owner@example.com',async()=>{team=(await scalar("select public.create_shared_library('共同作業') as id")).id;assert.notEqual(team,mine);const created=(await db.query('select * from public.libraries where id=$1',[team])).rows[0];assert.equal(created.personal,false);assert.equal(created.owner_id,ids[0]);assert.equal((await db.query('select * from public.library_members where library_id=$1',[team])).rows[0].role,'owner');assert.deepEqual((await db.query('select state from public.library_state where library_id=$1',[team])).rows[0].state,state);await assert.rejects(db.query("select public.create_shared_library('   ')"),/Invalid library name/);});
 await as(1,'editor@example.com',async()=>{assert.equal((await db.query('select * from public.library_state where library_id=$1',[team])).rows.length,0);});
 await db.exec(readFileSync(new URL('../../supabase/library-aggregation.sql',import.meta.url),'utf8'));
 const personalState={...state,items:[{id:'own-filament',name:'素材A',remaining:800,tags:['教室']}],reservations:[{title:'個人の予約'}]};
 await as(0,'owner@example.com',async()=>{const rev=(await db.query('select revision from public.library_state where library_id=$1',[mine])).rows[0].revision;await db.query('select public.save_library_state($1,$2,$3)',[mine,rev,personalState]);await db.query('select public.share_my_filaments($1,true)',[team]);await db.query("select public.invite_library_member($1,'newviewer@example.com','viewer')",[team]);});
 await as(3,'newviewer@example.com',async()=>{await db.query('select public.ensure_my_library()');const rows=(await scalar('select public.get_shared_filaments($1) as items',[team])).items;assert.equal(rows.length,1);assert.equal(rows[0].item.remaining,800);assert.deepEqual(rows[0].item.tags,['教室']);assert.equal(rows[0].reservations,undefined);assert.equal((await db.query('select * from public.library_state where library_id=$1',[mine])).rows.length,0);await assert.rejects(db.query('select public.share_my_filaments($1,true)',[team]),/editor required/);});
 await as(1,'editor@example.com',async()=>{await assert.rejects(db.query('select public.get_shared_filaments($1)',[team]),/Member required/);await assert.rejects(db.query('select public.share_my_filaments($1,true)',[team]),/editor required/);});
 await as(0,'owner@example.com',async()=>{const rev=(await db.query('select revision from public.library_state where library_id=$1',[mine])).rows[0].revision;personalState.items[0].remaining=500;await db.query('select public.save_library_state($1,$2,$3)',[mine,rev,personalState]);assert.equal((await scalar('select public.get_shared_filaments($1) as items',[team])).items[0].item.remaining,500);personalState.items=[];await db.query('select public.save_library_state($1,$2,$3)',[mine,rev+1,personalState]);assert.equal((await scalar('select public.get_shared_filaments($1) as items',[team])).items.length,0);await db.query('select public.share_my_filaments($1,false)',[team]);assert.equal((await scalar('select public.my_filaments_shared($1) as yes',[team])).yes,false);});
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from public.library_state'),/permission denied/);
 await assert.rejects(db.query('select public.ensure_my_library()'),/permission denied/);await assert.rejects(db.query("select public.allow_spool_account('bad@example.com')"),/permission denied/);await assert.rejects(db.query("select public.grant_spool_admin('bad@example.com')"),/permission denied/);await assert.rejects(db.query("select public.create_shared_library('bad')"),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query("select public from storage.buckets where id='spool-models'")).rows[0].public,false);
 } finally {await db.close()}
});
