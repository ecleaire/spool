import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../../online/node_modules/@electric-sql/pglite/dist/index.js';
import release from '../../supabase/functions/spool-events/release.mjs';

const sql=await readFile(new URL('../../supabase/event-submissions.sql',import.meta.url),'utf8');
const db=new PGlite();
try{
  await db.exec('create role anon; create role authenticated; create role service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean);');
  await db.exec(sql);await db.exec(sql);
  assert.deepEqual((await db.query('select public from storage.buckets')).rows,[{public:false}]);
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(db.query('select * from public.spool_event_records'),/permission denied/);
    await db.exec('reset role');
  }
  const stored=new Map();
  const bucket={
    async get(key){
      if(key.endsWith('.json')){
        const row=(await db.query('select value, revision from public.spool_event_records where key=$1',[key])).rows[0];
        return row && {etag:row.revision,json:async()=>row.value};
      }
      const blob=stored.get(key);return blob && {body:blob.stream(),size:blob.size,httpMetadata:{contentType:blob.type}};
    },
    async put(key,value,{httpMetadata,onlyIf}={}){
      if(!key.endsWith('.json')){stored.set(key,new Blob([await new Response(value).arrayBuffer()],{type:httpMetadata.contentType}));return {}}
      const old=await this.get(key);
      if((old && onlyIf?.etagDoesNotMatch==='*') || (onlyIf?.etagMatches && old?.etag!==onlyIf.etagMatches))return null;
      await db.query('insert into public.spool_event_records(key,value) values($1,$2) on conflict(key) do update set value=excluded.value, revision=gen_random_uuid()',[key,value]);
      return this.get(key);
    },
    async list({prefix}){return {objects:(await db.query('select key from public.spool_event_records where key like $1',[prefix+'%'])).rows,truncated:false}}
  };
  function call(path,role,init){
    return release.fetch(new Request('https://example.invalid/api/'+path,init),{BUCKET:bucket,EVENT_IDENTITY:{
      fetch:async()=>role==='denied'?new Response(null,{status:403}):Response.json({id:role,allowed:true,canManageEvents:role==='admin'})
    }});
  }
  const form=new FormData();
  form.set('metadata',JSON.stringify({title:'星',comment:'ツリー用',author:'',root:'star.gltf',files:['star.gltf']}));
  for(const key of ['real','image'])form.set(key,new Blob(['mock photo'],{type:'image/png'}),key+'.png');
  form.set('model-0',new Blob(['{"asset":{"version":"2.0"}}']),'star.gltf');
  const result=await call('works','member',{method:'POST',body:form});
  assert.equal(result.status,201);
  const {work}=await result.json();
  assert.equal((await (await call('works','member')).json()).works[0].title,'星');
  const model='files/'+work.id+'/model-0';
  assert.equal((await (await call(model,'member')).json()).asset.version,'2.0');
  const visibility={method:'PUT',body:JSON.stringify({visibility:'hidden'})};
  assert.equal((await call('works/'+work.id+'/visibility','member',visibility)).status,403);
  assert.equal((await call('works/'+work.id+'/visibility','admin',visibility)).status,200);
  assert.equal((await (await call('works','member')).json()).works.length,0);
  for(const asset of ['real','image','model-0'])assert.equal((await call('files/'+work.id+'/'+asset,'member')).status,404);
  assert.equal((await call(model,'admin')).status,200);
  assert.equal((await call(model,'denied')).status,403);
  console.log('PASS: repeatable private schema, role isolation, work submission, model retrieval and hidden assets.');
}finally{await db.close()}
