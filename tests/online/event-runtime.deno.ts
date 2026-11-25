import assert from 'node:assert/strict';
import {internalRequest,projectKey,requiredSetting} from '../../supabase/functions/spool-events/runtime.ts';
const modern:Record<string,string>={SUPABASE_SECRET_KEYS:'{"default":"mock-server"}'};
assert.equal(projectKey('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEYS',name=>modern[name]),'mock-server');
assert.equal(projectKey('old','new',n=>n==='old'?'mock-legacy':undefined),'mock-legacy');
assert.throws(()=>projectKey('old','new',()=>'') ,/default/);
assert.throws(()=>requiredSetting('EVENT_S3_REGION',()=>undefined),/EVENT_S3_REGION/);
for(const method of ['GET','HEAD']){
  const inbound=new Request('https://example.invalid',{method});
  Object.defineProperty(inbound,'body',{get:()=>new ReadableStream()});
  assert.equal(internalRequest(inbound,'https://example.invalid/api/session','Bearer example').body,null);
}
const posted=new Request('https://example.invalid',{method:'POST',body:'file',headers:{'Content-Type':'text/plain'}});
assert.equal(await internalRequest(posted,'https://example.invalid/api/works','Bearer example').text(),'file');
console.log('PASS hosted key formats, missing setting names, bodyless session and streamed submission.');

// Run the deployed handler in-process with hosted Auth and PostgREST responses.
const project='https://fixture.supabase.co';
for(const [name,value] of Object.entries({
  SUPABASE_URL:project,SUPABASE_PUBLISHABLE_KEYS:'{"default":"mock-public"}',
  SUPABASE_SECRET_KEYS:'{"default":"mock-private"}',EVENT_S3_REGION:'mock-region',
  EVENT_S3_ACCESS_KEY_ID:'mock-id',EVENT_S3_SECRET_ACCESS_KEY:'mock-secret'
})) Deno.env.set(name,value);
for(const key of ['SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])Deno.env.delete(key);
let handle!:(request:Request)=>Promise<Response>;
Object.defineProperty(Deno,'serve',{value:(handler:typeof handle)=>{handle=handler}});
globalThis.fetch=async(input,init)=>{
  const r=new Request(input,init);
  assert.equal(new URL(r.url).origin,project);
  if(r.url.endsWith('/auth/v1/user'))return r.headers.get('Authorization')==='Bearer member'
    ? Response.json({id:'fixture-member'}) : new Response(null,{status:401});
  if(r.url.includes('/rpc/'))return Response.json(r.url.endsWith('/spool_allowed'));
  assert.equal(new URL(r.url).pathname,'/rest/v1/spool_event_records');
  return Response.json([]);
};
await import('../../supabase/functions/spool-events/index.ts');
const session=(token:string)=>handle(new Request(project+'/functions/v1/spool-events/api/session',{headers:{Origin:'https://ecleaire.github.io',Authorization:'Bearer '+token}}));
assert.equal((await session('invalid')).status,401);
Deno.env.delete('EVENT_S3_REGION');
const missing=await session('member');assert.equal(missing.status,503);
assert.match((await missing.json()).error,/EVENT_S3_REGION/);
Deno.env.set('EVENT_S3_REGION','mock-region');
const ready=await session('member');assert.equal(ready.status,200);
assert.equal((await ready.json()).user.id,'fixture-member');
console.log('PASS deployed session handler rejects invalid login, names missing configuration and opens for authorized members.');
