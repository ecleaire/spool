// Keep the release's file, image, XHR progress and streaming APIs on the same origin.
const config=__EVENT_CONFIG__;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function forward(event,url){
  const page=await self.clients.get(event.clientId);
  if(!page?.url.startsWith(self.registration.scope))return new Response(null,{status:403});
  const channel=new MessageChannel();
  const token=await new Promise(resolve=>{
    const timer=setTimeout(()=>resolve(null),10000);
    channel.port1.onmessage=message=>{clearTimeout(timer);resolve(message.data)};
    page.postMessage('event-authorization',[channel.port2]);
  });
  channel.port1.close();
  const failure=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
  if(!token)return failure('SPOOLにログインし直してください。',401);
  const request=event.request;
  const headers=new Headers({apikey:config.key,Authorization:'Bearer '+token});
  if(request.headers.has('Content-Type'))headers.set('Content-Type',request.headers.get('Content-Type'));
  try{
    const result=await fetch(config.url+'/functions/v1/spool-events'+url.pathname+url.search,{
      method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.blob(),
      credentials:'omit',redirect:'error',cache:'no-store',signal:request.signal
    });
    return new Response(result.body,{status:result.status,headers:{'Content-Type':result.headers.get('Content-Type')||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',"Content-Security-Policy":"default-src 'none'",
      ...(result.headers.has('Content-Disposition')?{'Content-Disposition':result.headers.get('Content-Disposition')}:{})}});
  }catch{return failure('イベントに接続できませんでした。通信状態を確認してください。',503)}
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin===self.location.origin && url.pathname.startsWith('/api/'))event.respondWith(forward(event,url));
});
