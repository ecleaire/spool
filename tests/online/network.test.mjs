import {test} from 'node:test';import assert from 'node:assert/strict';import {retryNetwork,retryingFetch,saveWithRetry} from '../../online/network.mjs';
const instant={wait:async()=>{}};
test('network failure retries once; permission errors do not retry',async()=>{let calls=0;assert.equal(await retryNetwork(async()=>{if(!calls++)throw new TypeError('Failed to fetch');return 7},instant),7);assert.equal(calls,2);calls=0;await assert.rejects(retryNetwork(async()=>{calls++;throw new TypeError('Failed to fetch')},instant),/Failed/);assert.equal(calls,2);calls=0;await assert.rejects(retryNetwork(async()=>{calls++;throw {code:'42501',message:'permission denied'}},instant));assert.equal(calls,1)});
test('changing account cancels the pending retry',async()=>{let current=true,calls=0;await assert.rejects(retryNetwork(async()=>{calls++;throw Error('Failed to fetch')},{valid:()=>current,wait:async()=>{current=false}}),e=>e.code==='CANCELLED');assert.equal(calls,1)});
test('fetch retries reads but does not repeat a non-idempotent create',async()=>{let count=0;const fetcher=retryingFetch(async()=>{if(!count++)throw Error('Failed to fetch');return {ok:true}});await fetcher('https://demo.supabase.co/rest/v1/libraries');assert.equal(count,2);count=0;await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/rpc/create_shared_library',{method:'POST'}));assert.equal(count,1)});
test('save lost before commit is retried with the same expected revision',async()=>{let calls=0;const result=await saveWithRetry(async(lib,rev,state)=>{calls++;assert.equal(rev,3);if(calls===1)throw Error('Failed to fetch');return 4},async()=>({data:{revision:3,state:{}}}),'a',3,{items:[1]},instant);assert.equal(result,4);assert.equal(calls,2)});
test('committed save with a lost response is recognized without a duplicate write',async()=>{let calls=0;const result=await saveWithRetry(async()=>{calls++;throw Error('Failed to fetch')},async()=>({data:{revision:4,state:{items:[{name:'a',id:1}]}}}),'a',3,{items:[{id:1,name:'a'}]},instant);assert.equal(result,4);assert.equal(calls,1)});
test('concurrent remote changes are not overwritten by retry',async()=>{let calls=0;await assert.rejects(saveWithRetry(async()=>{calls++;throw Error('Failed to fetch')},async()=>({data:{revision:4,state:{items:['another person']}}}),'a',3,{items:[1]},instant),e=>e.code==='40001');assert.equal(calls,1)});
test('stalled reads time out and stop after one retry',async()=>{let calls=0;const fetcher=retryingFetch((input,{signal})=>new Promise((resolve,reject)=>{calls++;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})}),{timeout:2});await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/libraries'),/タイムアウト/);assert.equal(calls,2)});
test('caller cancellation is not retried',async()=>{let calls=0;const controller=new AbortController();const fetcher=retryingFetch((input,{signal})=>new Promise((resolve,reject)=>{calls++;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})}));const request=fetcher('https://demo.supabase.co/rest/v1/libraries',{signal:controller.signal});controller.abort();await assert.rejects(request,e=>e.name==='AbortError');assert.equal(calls,1)});

test('administrative writes are not replayed after a lost response or self-demotion',async()=>{let calls=0;const fetcher=retryingFetch(async()=>{calls++;throw Error('Failed to fetch')});await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/rpc/set_library_member_access',{method:'POST'}));assert.equal(calls,1)});
test('temporary gateway failure retries a library read, never an account-access write',async()=>{let calls=0;const fetcher=retryingFetch(async()=>({status:++calls===1?503:200}));assert.equal((await fetcher('https://demo.supabase.co/rest/v1/libraries')).status,200);assert.equal(calls,2);calls=0;assert.equal((await fetcher('https://demo.supabase.co/rest/v1/rpc/set_spool_account_access',{method:'POST'})).status,503);assert.equal(calls,1)});

test('stalled non-idempotent RPCs release the UI without replaying an uncertain write',async()=>{
 for(const rpc of ['create_shared_library','set_spool_account_access','update_shared_purchase_plan','update_shared_booking','delete_shared_booking']){
  let calls=0,guard;const fetcher=retryingFetch((input,{signal}={})=>new Promise((resolve,reject)=>{calls++;signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})}),{timeout:2});
  try{const result=await Promise.race([fetcher('https://demo.supabase.co/rest/v1/rpc/'+rpc,{method:'POST'}).catch(error=>error),new Promise(resolve=>{guard=setTimeout(()=>resolve({code:'TEST_TIMEOUT'}),100)})]);assert.equal(result.code,'WRITE_RESULT_UNKNOWN');assert.equal(calls,1);}finally{clearTimeout(guard)}
 }
});

test('booking link reads and idempotent destination selection retry once',async()=>{
 for(const rpc of ['get_shared_bookings','get_booking_sharing','set_booking_sharing','stop_booking_sharing']){let calls=0;const fetcher=retryingFetch(async()=>{if(!calls++)throw Error('Failed to fetch');return {ok:true}});await fetcher('https://demo.supabase.co/rest/v1/rpc/'+rpc,{method:'POST'});assert.equal(calls,2);}
});

test('response-body stalls time out and retry once after headers have arrived',async()=>{
 let calls=0;
 const fetcher=retryingFetch(async(input,{signal})=>{calls++;if(calls===2)return new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}});return new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('Aborted','AbortError')),{once:true})}}),{headers:{'Content-Type':'application/json'}})},{timeout:5});
 assert.deepEqual(await (await fetcher('https://demo.supabase.co/rest/v1/libraries')).json(),{ok:true});assert.equal(calls,2);
});
test('storage reads keep exact binary bytes and headers while bounding the body',async()=>{
 const fetcher=retryingFetch(async()=>new Response(new Uint8Array([0,255,128]),{headers:{'Content-Type':'application/octet-stream'}}));
 const response=await fetcher('https://demo.supabase.co/storage/v1/object/authenticated/model');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[0,255,128]);assert.equal(response.headers.get('Content-Type'),'application/octet-stream');
});
test('a completed read is rejected when its account changed during the response',async()=>{
 let stamp=1;const fetcher=retryingFetch(async()=>{stamp++;return new Response('{}')},{context:()=>stamp});await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/libraries'),e=>e.code==='CANCELLED');
});

test('signed link creation retries once, without replaying a model upload',async()=>{
 let calls=0;const fetcher=retryingFetch(async()=>{if(++calls===1)throw Error('Failed to fetch');return new Response('{}')});await fetcher('https://demo.supabase.co/storage/v1/object/sign/spool-models/file',{method:'POST'});assert.equal(calls,2);calls=0;await assert.rejects(fetcher('https://demo.supabase.co/storage/v1/object/spool-models/file',{method:'POST'}));assert.equal(calls,1);
});
test('a stalled authentication response body is bounded without replaying the token request',async()=>{
 let calls=0;const fetcher=retryingFetch(async(input,{signal})=>{calls++;return new Response(new ReadableStream({start(c){signal.addEventListener('abort',()=>c.error(new DOMException('Aborted','AbortError')),{once:true})}}))},{timeout:4});await assert.rejects(fetcher('https://demo.supabase.co/auth/v1/token',{method:'POST'}),/タイムアウト/);assert.equal(calls,1);
});

test('an administrative RPC stalled after commit is reported uncertain and never replayed',async()=>{
 let calls=0;const fetcher=retryingFetch(async(input,{signal})=>{calls++;return new Response(new ReadableStream({start(c){signal.addEventListener('abort',()=>c.error(new DOMException('Aborted','AbortError')),{once:true})}}))},{timeout:4});await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/rpc/set_spool_account_access',{method:'POST'}),e=>e.code==='WRITE_RESULT_UNKNOWN');assert.equal(calls,1);
});

test('gateway responses release their unread body before retrying',async()=>{
 let cancelled=0,calls=0;
 const failed=new Response(new ReadableStream({cancel(){cancelled++}}),{status:503});
 const fetcher=retryingFetch(async()=>++calls===1?failed:new Response('{"ok":true}'));
 assert.deepEqual(await (await fetcher('https://demo.supabase.co/rest/v1/libraries')).json(),{ok:true});
 assert.equal(calls,2);assert.equal(cancelled,1,'Discarded gateway response must release its body');
});

test('concurrent identical metadata reads share transport, with independent bodies and no persistent cache',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);
 const fetcher=retryingFetch(async()=>{calls++;await gate;return new Response('{"items":[1]}')});
 const a=fetcher('https://demo.supabase.co/rest/v1/libraries'),b=fetcher('https://demo.supabase.co/rest/v1/libraries');
 assert.equal(calls,1);release();
 const responses=await Promise.all([a,b]);assert.notEqual(responses[0],responses[1]);
 assert.deepEqual(await Promise.all(responses.map(r=>r.json())),[{items:[1]},{items:[1]}]);
 await fetcher('https://demo.supabase.co/rest/v1/libraries');assert.equal(calls,2,'A completed read must be fetched fresh');
});
test('shared transport retries once for all readers and clears a rejected request',async()=>{
 let calls=0;const fetcher=retryingFetch(async()=>{calls++;throw Error('Failed to fetch')});
 const results=await Promise.allSettled([fetcher('https://demo.supabase.co/rest/v1/libraries'),fetcher('https://demo.supabase.co/rest/v1/libraries')]);
 assert.equal(calls,2);assert.ok(results.every(r=>r.status==='rejected'));
 await assert.rejects(fetcher('https://demo.supabase.co/rest/v1/libraries'));assert.equal(calls,4);
});
test('account changes never share an old pending read, even with the same URL',async()=>{
 let stamp=1,calls=0,release;const gate=new Promise(r=>release=r);
 const fetcher=retryingFetch(async()=>{calls++;await gate;return new Response('{}')},{context:()=>stamp});
 const old=fetcher('https://demo.supabase.co/rest/v1/libraries');stamp=2;
 const current=fetcher('https://demo.supabase.co/rest/v1/libraries');assert.equal(calls,2);release();
 await assert.rejects(old,e=>e.code==='CANCELLED');assert.deepEqual(await (await current).json(),{});
});
test('read sharing separates credentials, library arguments, and caller cancellation',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const controller=new AbortController();
 const fetcher=retryingFetch(async()=>{calls++;await gate;return new Response('{}')});
 const url='https://demo.supabase.co/rest/v1/rpc/get_my_library_permissions';
 const options={method:'POST',body:'{"lib":"a"}',headers:{Authorization:'Bearer A'}};
 const requests=[fetcher(url,options),fetcher(url,{...options,headers:{authorization:'Bearer A'}}),fetcher(url,{...options,body:'{"lib":"b"}'}),fetcher(url,{...options,headers:{Authorization:'Bearer B'}}),fetcher(url,{...options,signal:controller.signal})];
 assert.equal(calls,4);release();await Promise.all(requests);
});
test('writes and binary downloads are never coalesced',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const fetcher=retryingFetch(async()=>{calls++;await gate;return new Response('{}')});
 const requests=[];for(const [url,init] of [['https://demo.supabase.co/rest/v1/rpc/set_filament_sharing',{method:'POST',body:'{}'}],['https://demo.supabase.co/storage/v1/object/authenticated/model',{}]])requests.push(fetcher(url,init),fetcher(url,init));
 assert.equal(calls,4);release();await Promise.all(requests);
});
