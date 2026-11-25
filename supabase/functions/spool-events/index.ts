import release from './release.mjs';
import identity from './identity.mjs';
import {eventStorage} from './storage.ts';

const origin = 'https://ecleaire.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store',
  'Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers':'Content-Disposition',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type'};
function required(name:string) {
  const value=Deno.env.get(name);
  if(!value) throw new Error('Missing '+name);
  return value;
}
let bucket:ReturnType<typeof eventStorage>;
Deno.serve(async request=>{
  if(request.headers.get('Origin')!==origin) return new Response(null,{status:403});
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  try {
    const url=new URL(request.url);
    const path=url.pathname.match(/^(?:\/functions\/v1)?\/spool-events(\/api\/.*)$/)?.[1];
    if(!path || ['/api/session/spool','/api/health'].includes(path)) return new Response(null,{status:404,headers:cors});
    const auth=request.headers.get('Authorization');
    if(!auth) return Response.json({error:'ログインしてください。'},{status:401,headers:cors});
    const project=required('SUPABASE_URL');
    bucket??=eventStorage(project,required('SUPABASE_SERVICE_ROLE_KEY'),required('EVENT_S3_REGION'),required('EVENT_S3_ACCESS_KEY_ID'),required('EVENT_S3_SECRET_ACCESS_KEY'));
    const headers=new Headers({Authorization:auth});
    for(const name of ['Content-Type','Content-Length']) if(request.headers.has(name)) headers.set(name,request.headers.get(name)!);
    // Construct the internal request only after validating the actual Pages origin.
    const internal=new Request(origin+path+url.search,{method:request.method,headers,body:request.body});
    const result=await release.fetch(internal,{BUCKET:bucket,EVENT_IDENTITY:{
      fetch:(req:Request)=>identity.fetch(req,{SUPABASE_URL:project,SUPABASE_PUBLISHABLE_KEY:required('SUPABASE_ANON_KEY')})}});
    if(!result) throw new Error("Missing event response");
    const outgoing=new Headers(result.headers);
    for(const [key,value] of Object.entries(cors)) outgoing.set(key,value);
    return new Response(result.body,{status:result.status,headers:outgoing});
  } catch {
    return Response.json({error:'イベントの接続設定を確認してください。'},{status:503,headers:cors});
  }
});
