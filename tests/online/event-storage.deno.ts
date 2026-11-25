import {eventStorage} from "../../supabase/functions/spool-events/storage.ts";
import assert from 'node:assert/strict';
const seen=new Set<string>();
const service=Deno.serve({hostname:'127.0.0.1',port:0,onListen(){}},async req=>{
  const url=new URL(req.url);
  if(!url.pathname.startsWith('/storage/v1/s3/spool-event-files/'))return new Response(null,{status:404});
  assert.match(req.headers.get('Authorization')||'',/^AWS4-HMAC-SHA256 /);
  seen.add(req.method);
  if(req.method==='GET')return new Response('demo',{headers:{'Content-Type':'image/png','Content-Length':'4'}});
  if(req.method==='HEAD')return new Response(null,{headers:{'Content-Length':'4'}});
  if(url.searchParams.has('uploads'))return new Response('<InitiateMultipartUploadResult><UploadId>sample</UploadId></InitiateMultipartUploadResult>');
  if(url.searchParams.has('partNumber')){assert.equal(await req.text(),'part');return new Response(null,{headers:{ETag:'"etag"'}})}
  if(req.method==='POST')return new Response('<CompleteMultipartUploadResult><ETag>"end"</ETag></CompleteMultipartUploadResult>');
  return new Response(null,{status:200});
});
try{
  const store=eventStorage('http://127.0.0.1:'+service.addr.port,'mock-service-key','us-east-1','mock-access','mock-secret');
  await store.put('files/demo/real',new Blob(['demo']).stream(),{httpMetadata:{contentType:'image/png'}});
  const obj=await store.get('files/demo/real');assert.equal(await new Response(obj?.body).text(),'demo');
  assert.equal((await store.head('files/demo/real'))?.size,4);
  const {uploadId}=await store.createMultipartUpload('upload-assets/demo/model-0',{httpMetadata:{contentType:'application/octet-stream'}});
  assert.equal(uploadId,'sample');
  const upload=store.resumeMultipartUpload('upload-assets/demo/model-0',uploadId!);
  const part=await upload.uploadPart(1,new TextEncoder().encode('part'));
  await upload.complete([part]);await upload.abort();await store.delete('files/demo/real');
  assert.equal(seen.size,5);console.log('PASS Deno adapter: signed Supabase S3 paths, read, size, write, delete, multipart start/part/complete/abort');
}finally{await service.shutdown()}
