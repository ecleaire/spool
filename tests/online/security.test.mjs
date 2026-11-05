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
 create table auth.users(id uuid primary key,email text);
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
 await db.exec(readFileSync(new URL('../../supabase/library-names.sql',import.meta.url),'utf8'));
 const beforeRename=(await db.query('select state,revision from public.library_state where library_id=$1',[team])).rows[0];
 await as(0,'owner@example.com',async()=>{await db.query("select public.rename_spool_library($1,'  新しい共有名  ')",[team]);await assert.rejects(db.query("select public.rename_spool_library($1,'   ')",[team]),/Invalid library name/);});assert.equal((await db.query('select name from public.libraries where id=$1',[team])).rows[0].name,'新しい共有名');assert.deepEqual((await db.query('select state,revision from public.library_state where library_id=$1',[team])).rows[0],beforeRename);
 await as(3,'newviewer@example.com',async()=>{await assert.rejects(db.query("select public.rename_spool_library($1,'禁止')",[team]),/Owner required/);});await as(1,'editor@example.com',async()=>{await assert.rejects(db.query("select public.rename_spool_library($1,'禁止')",[team]),/Owner required/);});
 await db.exec(readFileSync(new URL('../../supabase/library-combination.sql',import.meta.url),'utf8'));let secondTeam;
 await as(0,'owner@example.com',async()=>{secondTeam=(await scalar("select public.create_shared_library('合体先') as id")).id;await db.query('select public.share_library_into($1,$2,true)',[secondTeam,team]);assert.equal((await scalar('select public.library_is_shared($1,$2) as yes',[secondTeam,team])).yes,true);await assert.rejects(db.query('select public.share_library_into($1,$1,true)',[team]),/editor required/);await db.query('select public.share_library_into($1,$2,false)',[secondTeam,team]);assert.equal((await scalar('select public.library_is_shared($1,$2) as yes',[secondTeam,team])).yes,false);});await as(3,'newviewer@example.com',async()=>{await assert.rejects(db.query('select public.share_library_into($1,$2,true)',[secondTeam,mine]),/owner required/);});

 await db.exec(readFileSync(new URL('../../supabase/selective-sharing.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/selective-sharing.sql',import.meta.url),'utf8'));
 const selections={...state,items:[{id:'a',name:'素材A'},{id:'b',name:'素材B'}]};
 const readShared=async()=> (await scalar('select public.get_shared_filaments($1) as items',[team])).items;
 await as(0,'owner@example.com',async()=>{
  const rev=(await scalar('select revision from public.library_state where library_id=$1',[mine])).revision;
  await db.query('select public.save_library_state($1,$2,$3)',[mine,rev,selections]);
  await db.query("select public.set_filament_sharing($1,$2,'selected',$3)",[team,mine,['a']]);assert.deepEqual((await readShared()).map(x=>x.item.id),['a']);
  selections.items.push({id:'c',name:'素材C'});await db.query('select public.save_library_state($1,$2,$3)',[mine,rev+1,selections]);assert.equal((await readShared()).length,1);
  await db.query("select public.set_filament_sharing($1,$2,'all','{}',$3)",[team,mine,['b']]);assert.deepEqual((await readShared()).map(x=>x.item.id),['a','c']);
  await db.query('select public.stop_shared_filaments($1,$2,$3)',[team,mine,['a']]);assert.deepEqual((await readShared()).map(x=>x.item.id),['c']);assert.equal((await scalar('select state from public.library_state where library_id=$1',[mine])).state.items.length,3);
  const setting=(await scalar('select public.get_filament_sharing($1) as links',[mine])).links[0];assert.equal(setting.mode,'all');assert.deepEqual(setting.excluded_ids.sort(),['a','b']);
  await assert.rejects(db.query("select public.set_filament_sharing($1,$2,'selected',$3)",[team,mine,['unknown']]),/Unknown source/);
 });
 await as(3,'newviewer@example.com',async()=>{assert.deepEqual((await readShared()).map(x=>x.item.id),['c']);assert.equal((await readShared())[0].can_stop,false);await assert.rejects(db.query('select public.get_filament_sharing($1)',[mine]),/owner required/);await assert.rejects(db.query('select public.stop_shared_filaments($1,$2,$3)',[team,mine,['c']]),/owner required/);await assert.rejects(db.query("select public.set_filament_sharing($1,$2,'selected',$3)",[team,mine,['a']]),/owner required/);await assert.rejects(db.query('select * from public.shared_library_sources'),/permission denied/);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_filament_sharing($1,$2,'none','{}')",[team,mine]);assert.equal((await readShared()).length,0);});
 await db.exec("alter table auth.users add column raw_user_meta_data jsonb not null default '{}'");
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{spool_display_name:'利用者A',spool_handle:'maker_a',email:'private@example.com'},ids[0]]);
 await db.exec(readFileSync(new URL('../../supabase/library-appearance.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/library-appearance.sql',import.meta.url),'utf8'));
 await as(0,'owner@example.com',async()=>{await db.query("select public.update_library_appearance($1,'個人の材料','#AABBCC')",[mine]);assert.equal((await scalar('select color from public.libraries where id=$1',[mine])).color,'#AABBCC');await assert.rejects(db.query("select public.update_library_appearance($1,'bad','red')",[mine]),/Invalid library color/);});
 await as(3,'newviewer@example.com',async()=>{const people=(await scalar('select public.get_library_member_profiles($1) as people',[team])).people;assert.equal(people.find(x=>x.user_id===ids[0]).display_name,'利用者A');assert.equal(people.find(x=>x.user_id===ids[0]).display_id,'maker_a');assert.ok(!JSON.stringify(people).includes('private@example.com'));await assert.rejects(db.query("select public.update_library_appearance($1,'bad','#111111')",[team]),/owner or participating/);await assert.rejects(db.query('select public.get_library_member_profiles($1)',[mine]),/Member required/);});
 await as(1,'editor@example.com',async()=>{await assert.rejects(db.query("select public.update_library_appearance($1,'private bad','#111111')",[mine]),/owner or participating/);await assert.rejects(db.query("select public.update_library_appearance($1,'not a member','#111111')",[team]),/owner or participating/);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.invite_library_member($1,'editor@example.com','editor')",[team]);});
 await as(1,'editor@example.com',async()=>{await db.query('select public.ensure_my_library()');await db.query("select public.update_library_appearance($1,'管理者が変更','#224466')",[team]);const revision=(await scalar('select revision from public.library_state where library_id=$1',[shared])).revision;await db.query('select public.save_library_state($1,$2,$3)',[shared,revision,{...state,items:[{id:'other-item',name:'相手の材料'}]}]);await db.query("select public.set_filament_sharing($1,$2,'all','{}')",[team,shared]);});
 await as(0,'owner@example.com',async()=>{assert.equal((await readShared()).length,1);await db.query('select public.stop_shared_filaments($1,$2,$3)',[team,shared,['other-item']]);assert.equal((await readShared()).length,0);});
 await db.exec(readFileSync(new URL('../../supabase/member-permissions.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/member-permissions.sql',import.meta.url),'utf8'));
 let restrictedState={...state,items:[{id:'stock-a',name:'材料A',remaining:1000},{id:'stock-b',name:'材料B',remaining:500}],reservations:[{id:'booking-a',title:'予約A',attachments:[]}]};
 const currentTeam=async()=>await scalar('select state,revision from public.library_state where library_id=$1',[team]);
 const writeTeam=async next=>{const current=await currentTeam();return db.query('select public.save_library_state($1,$2,$3)',[team,current.revision,next])};
 await as(0,'owner@example.com',async()=>{await writeTeam(restrictedState);await db.query("select public.set_library_member_permissions($1,$2,'editor',$3)",[team,ids[1],{inventory_use:true,bookings_create:true}]);await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'viewer',null)",[team,ids[0]]),/Owner permissions/);await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'editor',$3)",[team,ids[1],{evil:true}]),/Invalid permission/);});
 await as(1,'editor@example.com',async()=>{
  const flags=(await scalar('select public.get_my_library_permissions($1) as flags',[team])).flags;assert.equal(flags.inventory_use,true);assert.equal(flags.inventory_edit,false);assert.equal(flags.files_upload,false);
  restrictedState.items[0].remaining=900;await writeTeam(restrictedState);
  await assert.rejects(writeTeam({...restrictedState,items:restrictedState.items.map(x=>({...x,name:'変更'}))}),/inventory edit/);
  await assert.rejects(writeTeam({...restrictedState,items:[]}),/inventory delete/);
  await assert.rejects(writeTeam({...restrictedState,items:[...restrictedState.items,{id:'new',name:'追加'}]}),/inventory create/);
  await assert.rejects(writeTeam({...restrictedState,items:[...restrictedState.items].reverse()}),/reorder/);
  restrictedState.reservations.push({id:'booking-b',title:'新規予約',attachments:[]});await writeTeam(restrictedState);
  await assert.rejects(writeTeam({...restrictedState,reservations:restrictedState.reservations.map(x=>({...x,title:'変更'}))}),/bookings edit/);
  await assert.rejects(writeTeam({...restrictedState,reservations:[]}),/bookings delete/);
  await assert.rejects(writeTeam({...restrictedState,deleted:[{id:'stolen-trash'}]}),/inventory trash/);
  await assert.rejects(writeTeam({...restrictedState,customColorPresets:[{id:'preset'}]}),/color presets/);
  await assert.rejects(writeTeam({...restrictedState,items:[restrictedState.items[0],restrictedState.items[0]]}),/unique IDs/);
  await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'editor',null)",[team,ids[1]]),/owner required/);
  await assert.rejects(db.query('select public.get_library_member_permissions($1)',[team]),/owner required/);
  await assert.rejects(db.query("select public.set_filament_sharing($1,$2,'all','{}')",[team,shared]),/editor required/);
  // Revocation of one's own outgoing share is still available.
  await db.query("select public.set_filament_sharing($1,$2,'none','{}')",[team,shared]);
  await assert.rejects(db.query("insert into public.library_files(library_id,booking_id,name,object_path,size) values($1,'booking-a','test.stl','denied',4)",[team]),/row-level security/);
 });
 const uploadedFile='66666666-6666-4666-8666-666666666666',pendingFile='77777777-7777-4777-8777-777777777777',uploadedPath=team+'/'+uploadedFile+'/model';
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_permissions($1,$2,'editor',$3)",[team,ids[1],{bookings_edit:true,files_upload:true}]);});
 await as(1,'editor@example.com',async()=>{
  await db.query("insert into public.library_files(id,library_id,booking_id,name,object_path,size) values($1,$2,'booking-a','test.stl',$3,4)",[uploadedFile,team,uploadedPath]);await db.query("insert into storage.objects(bucket_id,name) values('spool-models',$1)",[uploadedPath]);
  restrictedState.reservations[0].attachments=[{id:uploadedFile,name:'test.stl',kind:'online',size:4}];await writeTeam(restrictedState);
  await assert.rejects(writeTeam({...restrictedState,reservations:restrictedState.reservations.map(x=>({...x,attachments:[]}))}),/file delete/);
  assert.equal((await db.query('delete from storage.objects where name=$1 returning *',[uploadedPath])).rows.length,0);assert.equal((await db.query('delete from public.library_files where id=$1 returning *',[uploadedFile])).rows.length,0);
  await db.query("insert into public.library_files(id,library_id,booking_id,name,object_path,size) values($1,$2,'booking-a','pending.stl',$3,4)",[pendingFile,team,team+'/'+pendingFile+'/model']);assert.equal((await db.query('delete from public.library_files where id=$1 returning *',[pendingFile])).rows.length,1);
 });
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_permissions($1,$2,'editor',$3)",[team,ids[1],{bookings_edit:true,files_delete:true}]);});
 await as(1,'editor@example.com',async()=>{restrictedState.reservations[0].attachments=[];await writeTeam(restrictedState);assert.equal((await db.query('delete from storage.objects where name=$1 returning *',[uploadedPath])).rows.length,1);assert.equal((await db.query('delete from public.library_files where id=$1 returning *',[uploadedFile])).rows.length,1);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_permissions($1,$2,'viewer',$3)",[team,ids[1],{inventory_edit:true}]);});
 await as(1,'editor@example.com',async()=>{assert.equal((await scalar("select public.spool_has_permission($1,'inventory_edit') as yes",[team])).yes,false);assert.equal((await db.query('select * from public.library_state where library_id=$1',[team])).rows.length,1);await assert.rejects(writeTeam(restrictedState),/Editor required/);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_permissions($1,$2,'editor',null)",[team,ids[1]]);assert.equal((await scalar('select jsonb_array_length(public.get_library_member_permissions($1)) as n',[team])).n,3);});
 await as(1,'editor@example.com',async()=>{assert.equal((await scalar("select public.spool_has_permission($1,'inventory_edit') as yes",[team])).yes,true);});
 await db.exec(readFileSync(new URL('../../supabase/library-administrators.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/library-administrators.sql',import.meta.url),'utf8'));
 await as(1,'editor@example.com',async()=>{
  assert.equal((await scalar('select public.get_my_library_permissions($1) as p',[team])).p._admin,false);
  await assert.rejects(db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[1]]),/administrator required/);
  await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'editor',null)",[team,ids[1]]),/administrator required/);
  await assert.rejects(db.query('update public.library_members set is_library_admin=true where library_id=$1 and user_id=$2',[team,ids[1]]),/permission denied/);
  await assert.rejects(db.query("select public.invite_library_member($1,'newadmin-test@example.com','viewer')",[team]),/administrator required/);
 });
 await as(0,'owner@example.com',async()=>{
  assert.equal((await scalar('select public.get_my_library_permissions($1) as p',[team])).p._admin,true);
  await db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[1]]);
 });
 await as(1,'editor@example.com',async()=>{
  const flags=(await scalar('select public.get_my_library_permissions($1) as p',[team])).p;assert.equal(flags._admin,true);assert.equal(flags.inventory_edit,true);
  await db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[3]]);
  await assert.rejects(db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[mine,ids[1]]),/administrator required/);
  await assert.rejects(db.query("select public.set_library_member_access($1,$2,'viewer',null,false)",[team,ids[0]]),/Host permissions/);
  await assert.rejects(db.query('select public.remove_library_member($1,$2)',[team,ids[0]]),/Host cannot/);
  await db.query("select public.invite_library_member($1,'newadmin-test@example.com','viewer')",[team]);
  assert.equal((await db.query('select * from public.library_invitations where library_id=$1',[team])).rows.length,1);
  await db.query('delete from public.library_invitations where library_id=$1',[team]);
  await db.query("select public.update_library_appearance($1,'共有管理者が変更','#226633')",[team]);
  const profiles=(await scalar('select public.get_library_member_profiles($1) as p',[team])).p;assert.equal(profiles.find(x=>x.user_id===ids[3]).is_library_admin,true);
 });
 await as(3,'newviewer@example.com',async()=>{
  assert.equal((await scalar('select public.get_my_library_permissions($1) as p',[team])).p._admin,true);
  await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[team,ids[1],{inventory_use:true}]);
 });
 await as(1,'editor@example.com',async()=>{
  const flags=(await scalar('select public.get_my_library_permissions($1) as p',[team])).p;assert.equal(flags._admin,false);assert.equal(flags.inventory_use,true);assert.equal(flags.inventory_edit,false);
  await assert.rejects(db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[1]]),/administrator required/);
  await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'editor',null)",[team,ids[1]]),/administrator required/);
 });
 await as(3,'newviewer@example.com',async()=>{await db.query("select public.set_library_member_access($1,$2,'viewer',null,false)",[team,ids[3]]);await assert.rejects(db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[3]]),/administrator required/);});
 await db.exec(readFileSync(new URL('../../supabase/upgrade-existing.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/upgrade-existing.sql',import.meta.url),'utf8'));
 await as(0,'owner@example.com',async()=>{const created=(await scalar("select public.create_shared_library('更新確認') as id")).id;const original=await scalar('select state from public.library_state where library_id=$1',[mine]);const chosen=original.state.items[0].id;await db.query("select public.set_filament_sharing($1,$2,'selected',$3)",[created,mine,[chosen]]);const visible=(await scalar('select public.get_shared_filaments($1) as rows',[created])).rows;assert.equal(visible.length,1);assert.equal(visible[0].source_item_id,chosen);assert.equal((await scalar('select state from public.library_state where library_id=$1',[mine])).state.items.length,original.state.items.length);});
 // Account-level limits bound all libraries; purchase-plan sharing is explicit and narrow.
 let planSource,planTarget;
 const plan={id:'plan-a',name:'PLA planned',brand:'ELEGOO',material:'PLA',colorName:'青',color:'#2240AF',capacity:1000,remaining:1000,inventoryStatus:'planned',note:'原本',image:'',tags:[]},unshared={...plan,id:'plan-b'},owned={...plan,id:'stock-a',inventoryStatus:'owned'};
 await as(0,'owner@example.com',async()=>{
  planSource=(await scalar("select public.create_shared_library('購入予定の原本') as id")).id;planTarget=(await scalar("select public.create_shared_library('購入予定の共有先') as id")).id;
  await db.query('select public.save_library_state($1,0,$2)',[planSource,{...state,items:[plan,unshared,owned]}]);
  await db.query("select public.invite_library_member($1,'editor@example.com','editor')",[planTarget]);await db.query("select public.invite_library_member($1,'viewer@example.com','viewer')",[planTarget]);
  await db.query("select public.set_filament_sharing($1,$2,'all','{}')",[planTarget,planSource]);assert.deepEqual((await scalar('select public.get_shared_filaments($1) as rows',[planTarget])).rows.map(x=>x.source_item_id),['stock-a']);
  await db.query("select public.set_filament_sharing($1,$2,'all',$3)",[planTarget,planSource,['plan-a','stock-a']]);const rows=(await scalar('select public.get_shared_filaments($1) as rows',[planTarget])).rows;assert.equal(rows.length,2);assert.equal(rows.find(x=>x.source_item_id==='plan-a').can_edit_plan,true);assert.equal(rows[0].source_revision,1);assert.deepEqual((await scalar('select public.get_filament_sharing($1) as links',[planSource])).links.find(x=>x.shared_library_id===planTarget).included_ids,['plan-a']);
 });
 await as(1,'editor@example.com',async()=>{
  await db.query('select public.ensure_my_library()');
  assert.equal((await scalar('select public.update_shared_purchase_plan($1,$2,$3,1,$4) as revision',[planTarget,planSource,'plan-a',{name:'変更済み',shopUrl:'https://example.com/blue'}])).revision,2);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,1,$4)',[planTarget,planSource,'plan-a',{name:'古い変更'}]),/changed/);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,2,$4)',[planTarget,planSource,'plan-b',{name:'未共有を変更'}]),/Explicit/);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,2,$4)',[planTarget,planSource,'plan-a',{id:'別ID'}]),/Invalid/);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,2,$4)',[planTarget,planSource,'plan-a',{shopUrl:'javascript:alert(1)'}]),/Invalid/);
  await db.query('select public.update_shared_purchase_plan($1,$2,$3,2,$4)',[planTarget,planSource,'plan-a',{inventoryStatus:'owned'}]);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,3,$4)',[planTarget,planSource,'plan-a',{name:'在庫を変更'}]),/purchase plan/);
 });
 await as(2,'viewer@example.com',async()=>{await db.query('select public.ensure_my_library()');await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,3,$4)',[planTarget,planSource,'plan-a',{name:'閲覧者の変更'}]),/editor required/);await assert.rejects(db.query('select public.get_spool_accounts()'),/Service administrator/);});

 // Purchase wishes have their own grants; type conversion cannot bypass stock authority.
 let wishesLibrary;
 await as(0,'owner@example.com',async()=>{wishesLibrary=(await scalar("select public.create_shared_library('希望専用') as id")).id;await db.query("select public.invite_library_member($1,'editor@example.com','editor')",[wishesLibrary]);});
 await as(1,'editor@example.com',async()=>{await db.query('select public.ensure_my_library()');});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[wishesLibrary,ids[1],{wishlist_create:true}]);});
 const wish={...plan,id:'wish-only',purchaseIntent:'wish'},wishState={...state,items:[wish]};
 await as(1,'editor@example.com',async()=>{
  await assert.rejects(db.query('select public.save_library_state($1,0,$2)',[wishesLibrary,{...state,items:[owned]}]),/Permission denied/);
  await assert.rejects(db.query('select public.save_library_state($1,0,$2)',[wishesLibrary,{...state,items:[plan]}]),/Permission denied/);
  assert.equal((await scalar('select public.save_library_state($1,0,$2) as revision',[wishesLibrary,wishState])).revision,1);
  await assert.rejects(db.query('select public.save_library_state($1,1,$2)',[wishesLibrary,{...wishState,items:[{...wish,name:'変更'}]}]),/Permission denied/);
 });
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[wishesLibrary,ids[1],{wishlist_edit:true}]);});
 await as(1,'editor@example.com',async()=>{
  await assert.rejects(db.query('select public.save_library_state($1,1,$2)',[wishesLibrary,{...wishState,items:[{...wish,inventoryStatus:'owned'}]}]),/conversion/);
  await assert.rejects(db.query('select public.save_library_state($1,1,$2)',[wishesLibrary,{...wishState,items:[{...wish,purchaseIntent:'planned'}]}]),/conversion/);
  assert.equal((await scalar('select public.save_library_state($1,1,$2) as revision',[wishesLibrary,{...wishState,items:[{...wish,name:'希望を編集'}]}])).revision,2);
 });
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[wishesLibrary,ids[1],{wishlist_edit:true,purchase_create:true}]);});
 await as(1,'editor@example.com',async()=>{assert.equal((await scalar('select public.save_library_state($1,2,$2) as revision',[wishesLibrary,{...wishState,items:[{...wish,purchaseIntent:'planned'}]}])).revision,3);});

 // A shared source wish can be edited without inventory or purchase-plan edit rights.
 await as(0,'owner@example.com',async()=>{
  await db.query('select public.save_library_state($1,3,$2)',[wishesLibrary,{...state,items:[wish]}]);
  await db.query("select public.set_filament_sharing($1,$2,'selected',$3)",[planTarget,wishesLibrary,[wish.id]]);
  await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[planTarget,ids[1],{wishlist_edit:true}]);
 });
 await as(1,'editor@example.com',async()=>{
  const rows=(await scalar('select public.get_shared_filaments($1) as rows',[planTarget])).rows;assert.equal(rows.find(x=>x.source_item_id===wish.id).can_edit_plan,true);
  await assert.rejects(db.query('select public.update_shared_purchase_plan($1,$2,$3,4,$4)',[planTarget,wishesLibrary,wish.id,{purchaseIntent:'planned'}]),/editor required/);
  assert.equal((await scalar('select public.update_shared_purchase_plan($1,$2,$3,4,$4) as revision',[planTarget,wishesLibrary,wish.id,{name:'共有から希望を編集'}])).revision,5);
 });
 await db.query('update auth.users set email=$1 where id=$2',['editor@example.com',ids[1]]);
 await as(0,'owner@example.com',async()=>{
  const original=(await scalar('select state from public.library_state where library_id=$1',[planSource])).state;assert.equal(original.items[0].name,'変更済み');assert.equal(original.items[1].name,unshared.name);assert.equal(original.items[2].inventoryStatus,'owned');assert.deepEqual(original.reservations,[]);
  assert.ok(Array.isArray((await scalar('select public.get_spool_accounts() as accounts')).accounts));
  await assert.rejects(db.query("select public.set_spool_account_access('owner@example.com','disabled','{}')"),/own service administrator/);
  await assert.rejects(db.query("select public.set_spool_account_access('editor@example.com','standard','{\"unknown\":true}')"),/Invalid/);
  await db.query("select public.set_spool_account_access('editor@example.com','shared_only','{\"inventory_edit\":false,\"create_shared\":false,\"manage_members\":false}')");
  assert.equal((await scalar('select public.get_library_member_permissions($1) as rows',[planTarget])).rows.find(x=>x.user_id===ids[1]).service_limits.inventory_edit,false);
 });
 await as(1,'editor@example.com',async()=>{const chosen=(await scalar('select public.ensure_my_library() as id')).id;assert.ok(chosen);assert.equal((await db.query('select * from public.libraries where personal')).rows.length,0);assert.equal((await scalar('select public.get_my_library_permissions($1) as p',[planTarget])).p.inventory_edit,false);await assert.rejects(db.query("select public.create_shared_library('不可')"),/not permitted/);await assert.rejects(db.query("select public.invite_library_member($1,'blocked@example.com','viewer')",[planTarget]),/administrator required/);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_spool_account_access('editor@example.com','standard','{}')");await db.query("select public.set_spool_account_access('viewer@example.com','disabled','{}')");});
 await as(2,'viewer@example.com',async()=>{assert.equal((await scalar('select public.spool_allowed() as allowed')).allowed,false);assert.equal((await db.query('select * from public.libraries')).rows.length,0);await assert.rejects(db.query('select public.ensure_my_library()'),/invitation required/);});
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_spool_account_access('viewer@example.com','standard','{}')");});
 await as(1,'editor@example.com',async()=>{assert.equal((await db.query('select * from public.libraries where personal')).rows.length>0,true);});
 await db.exec(readFileSync(new URL('../../supabase/shared-library-privacy.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/shared-inventory-sync.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/shared-inventory-sync.sql',import.meta.url),'utf8'));
 await as(0,'owner@example.com',async()=>{await db.query("select public.set_library_member_access($1,$2,'editor',$3,false)",[planTarget,ids[1],{inventory_use:true}]);});
 await as(1,'editor@example.com',async()=>{
 await assert.rejects(db.query('select public.get_library_member_profiles($1)',[planTarget]),/Member required/);assert.equal((await db.query('select * from public.library_members where library_id=$1',[planTarget])).rows.length,1);
 const rows=(await scalar('select public.get_shared_filaments($1) as rows',[planTarget])).rows;const row=rows.find(x=>x.source_item_id==='stock-a');assert.equal(row.can_use_owned,true);assert.equal(row.can_edit_owned,false);
 assert.equal((await scalar('select public.update_shared_filament($1,$2,$3,3,$4) as revision',[planTarget,planSource,'stock-a',{remaining:900}])).revision,4);
 await assert.rejects(db.query('select public.update_shared_filament($1,$2,$3,4,$4)',[planTarget,planSource,'stock-a',{name:'forbidden'}]),/editor required/);
 await assert.rejects(db.query('select public.update_shared_filament($1,$2,$3,4,$4)',[planTarget,planSource,'stock-a',{remaining:950}]),/editor required/);
 await assert.rejects(db.query('select public.update_shared_filament($1,$2,$3,3,$4)',[planTarget,planSource,'stock-a',{remaining:800}]),/changed/);
 });
 await as(0,'owner@example.com',async()=>{assert.equal((await scalar('select state from public.library_state where library_id=$1',[planSource])).state.items.find(x=>x.id==='stock-a').remaining,900);await db.query("select public.set_library_member_access($1,$2,'editor',$3,true)",[planTarget,ids[1],null]);});
 await as(1,'editor@example.com',async()=>{assert.equal((await scalar('select public.update_shared_filament($1,$2,$3,4,$4) as revision',[planTarget,planSource,'stock-a',{name:'shared admin edit',tags:['青系']}])).revision,5);await assert.rejects(db.query('select public.update_shared_filament($1,$2,$3,5,$4)',[planTarget,planSource,'stock-a',{id:'bad'}]),/Invalid/);});
 let lifecycleId;const lifeFile='88888888-8888-4888-8888-888888888888';
 await as(0,'owner@example.com',async()=>{lifecycleId=(await scalar("select public.create_shared_library('削除確認') as id")).id;await db.query("select public.invite_library_member($1,'editor@example.com','editor')",[lifecycleId]);await assert.rejects(db.query('select public.leave_shared_library($1)',[lifecycleId]),/Host cannot/);await assert.rejects(db.query('select public.get_shared_library_deletion_info($1)',[mine]),/Shared library/);await assert.rejects(db.query('select public.delete_shared_library($1,$2,0,true)',[mine,'個人の材料']),/Personal library/);await db.query("insert into public.library_files(id,library_id,booking_id,name,object_path,size) values($1,$2,'booking','test.stl',$3,4)",[lifeFile,lifecycleId,lifecycleId+'/'+lifeFile+'/model']);await db.query("insert into storage.objects(bucket_id,name) values('spool-models',$1)",[lifecycleId+'/'+lifeFile+'/model']);await assert.rejects(db.query("select public.delete_shared_library($1,'間違い',0,true)",[lifecycleId]),/confirmation/);await assert.rejects(db.query("select public.delete_shared_library($1,'削除確認',0,false)",[lifecycleId]),/confirmation/);await assert.rejects(db.query("select public.delete_shared_library($1,'削除確認',99,true)",[lifecycleId]),/changed/);await assert.rejects(db.query("select public.delete_shared_library($1,'削除確認',0,true)",[lifecycleId]),/Storage files remain/);});
 await as(1,'editor@example.com',async()=>{await db.query('select public.ensure_my_library()');await assert.rejects(db.query('select public.get_shared_library_deletion_info($1)',[lifecycleId]),/Host required/);await assert.rejects(db.query("select public.delete_shared_library($1,'削除確認',0,true)",[lifecycleId]),/Host required/);await db.query("select public.set_filament_sharing($1,$2,'all','{}')",[lifecycleId,shared]);await db.query('select public.leave_shared_library($1)',[lifecycleId]);assert.equal((await db.query('select * from public.library_state where library_id=$1',[lifecycleId])).rows.length,0);await assert.rejects(db.query('select public.leave_shared_library($1)',[lifecycleId]),/Member required/);});
 await as(0,'owner@example.com',async()=>{assert.equal((await scalar('select public.get_shared_library_deletion_info($1) as info',[lifecycleId])).info.object_paths.length,1);assert.equal((await scalar('select public.get_shared_filaments($1) as rows',[lifecycleId])).rows.length,0);await db.query("delete from storage.objects where bucket_id='spool-models' and name=$1",[lifecycleId+'/'+lifeFile+'/model']);await db.query("select public.delete_shared_library($1,'削除確認',0,true)",[lifecycleId]);assert.equal((await db.query('select * from public.libraries where id=$1',[lifecycleId])).rows.length,0);assert.equal((await db.query('select * from public.library_files where library_id=$1',[lifecycleId])).rows.length,0);assert.equal((await db.query('select * from public.library_state where library_id=$1',[mine])).rows.length,1);});
 // Exercise the manual purge ONLY in this isolated synthetic database.
 const personalBefore=(await db.query('select id,name from public.libraries where personal order by id')).rows;
 const purge=readFileSync(new URL('../../supabase/purge-shared-libraries.sql',import.meta.url),'utf8');await assert.rejects(db.exec(purge),/Both deletion confirmations/);await db.exec('rollback');
 const confirmed=purge.replace("'spool.purge_confirmation_1','未入力'","'spool.purge_confirmation_1','共有ライブラリをすべて削除'").replace("'spool.purge_confirmation_2','未入力'","'spool.purge_confirmation_2','個人ライブラリは保持'");
 await db.query("insert into storage.objects(bucket_id,name) values('spool-models',$1)",[team+'/purge-test/model']);await assert.rejects(db.exec(confirmed),/Online files remain/);await db.exec('rollback');assert.equal((await scalar('select count(*)::int as n from public.libraries where not personal')).n>0,true);await db.query("delete from storage.objects where bucket_id='spool-models' and name=$1",[team+'/purge-test/model']);
 await db.exec(confirmed);assert.equal((await scalar('select count(*)::int as n from public.libraries where not personal')).n,0);assert.deepEqual((await db.query('select id,name from public.libraries where personal order by id')).rows,personalBefore);
 await db.exec('set role anon');
 await assert.rejects(db.query('select public.leave_shared_library($1)',[team]),/permission denied/);
 await assert.rejects(db.query('select public.get_shared_library_deletion_info($1)',[team]),/permission denied/);
 await assert.rejects(db.query("select public.delete_shared_library($1,'削除確認',0,true)",[team]),/permission denied/);
 await assert.rejects(db.query("select public.set_library_member_access($1,$2,'editor',null,true)",[team,ids[1]]),/permission denied/);
 await assert.rejects(db.query('select public.get_my_library_permissions($1)',[team]),/permission denied/);
 await assert.rejects(db.query('select public.get_library_member_permissions($1)',[team]),/permission denied/);
 await assert.rejects(db.query("select public.set_library_member_permissions($1,$2,'editor',null)",[team,ids[1]]),/permission denied/);
 await assert.rejects(db.query('select * from public.library_state'),/permission denied/);
 await assert.rejects(db.query('select public.get_library_member_profiles($1)',[team]),/permission denied/);await assert.rejects(db.query('select public.get_filament_sharing($1)',[mine]),/permission denied/);await assert.rejects(db.query('select public.ensure_my_library()'),/permission denied/);await assert.rejects(db.query("select public.allow_spool_account('bad@example.com')"),/permission denied/);await assert.rejects(db.query("select public.grant_spool_admin('bad@example.com')"),/permission denied/);await assert.rejects(db.query("select public.create_shared_library('bad')"),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query("select public from storage.buckets where id='spool-models'")).rows[0].public,false);
 } finally {await db.close()}
});
