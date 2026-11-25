import release from './release.mjs';
import identity from './identity.mjs';
import {eventStorage} from './storage.ts';

import {ConfigurationError,requiredSetting,projectKey,internalRequest,guestOperation} from './runtime.ts';

const origin = 'https://ecleaire.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store',
  'Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers':'Content-Disposition',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type'};
let bucket:ReturnType<typeof eventStorage>;
Deno.serve(async request=>{
  if(request.headers.get('Origin')!==origin) return new Response(null,{status:403});
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  try {
    const url=new URL(request.url);
    const path=url.pathname.match(/^(?:\/functions\/v1)?\/spool-events(\/api\/.*)$/)?.[1];
    if(!path || ['/api/session/spool','/api/health'].includes(path)) return new Response(null,{status:404,headers:cors});
    const auth=request.headers.get('Authorization');
    const guestId=auth?.match(/^Bearer guest:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)?.[1];
    const guest=!auth || !!guestId;
    if(guest && (!guestOperation(path,request.method) || (request.method==='POST' && !guestId))){
      return Response.json({error:'作品を投稿するにはSPOOLにログインしてください。'},{status:401,headers:cors});
    }
    const project=requiredSetting('SUPABASE_URL');
    const internal=internalRequest(request,origin+path+url.search,auth||'');
    let verified=guest
      ? Response.json({id:'guest:'+(guestId||'reader'),allowed:true,canManageEvents:false,guest:true})
      : await identity.fetch(internal,{SUPABASE_URL:project,
        SUPABASE_PUBLISHABLE_KEY:projectKey('SUPABASE_ANON_KEY','SUPABASE_PUBLISHABLE_KEYS')});
    // A signed-in Google account without SPOOL membership has the public visitor's scope.
    if(verified.status===403 && guestOperation(path,request.method)){
      const denied=await verified.clone().json();
      if(typeof denied.id==='string' && denied.id){
        verified=Response.json({id:'guest:'+denied.id,allowed:true,canManageEvents:false,guest:true});
      }
    }
    if(!verified.ok){
      const message=verified.status===401?'SPOOLにログインし直してください。':verified.status===403?'このアカウントにはイベントの利用許可がありません。':'Supabaseの利用許可を確認できませんでした。';
      return Response.json({error:message},{status:verified.status,headers:cors});
    }
    bucket??=eventStorage(project,projectKey('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEYS'),
      requiredSetting('EVENT_S3_REGION'),requiredSetting('EVENT_S3_ACCESS_KEY_ID'),requiredSetting('EVENT_S3_SECRET_ACCESS_KEY'));
    const result=await release.fetch(internal,{BUCKET:bucket,EVENT_IDENTITY:{fetch:async()=>verified.clone()}});
    if(!result) throw new Error("Missing event response");
    const outgoing=new Headers(result.headers);
    for(const [key,value] of Object.entries(cors)) outgoing.set(key,value);
    return new Response(result.body,{status:result.status,headers:outgoing});
  } catch(error) {
    const message=error instanceof ConfigurationError?error.message:'イベント関数の初期化に失敗しました。管理者に連絡してください。';
    console.error('spool-events initialization',error instanceof ConfigurationError?message:error instanceof Error?error.name:'unknown');
    return Response.json({error:message},{status:503,headers:cors});
  }
});
