import {createClient} from '@supabase/supabase-js';
import {createRememberedAuthStorage} from '../auth-storage.mjs';
import {authStorageKey} from '../security.mjs';

const config=__EVENT_CONFIG__;
const key=authStorageKey(config.url);
const auth=createClient(config.url,config.key,{auth:{storageKey:key,storage:createRememberedAuthStorage({key}).storage,
  persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}}).auth;

async function start(){
  if(!('serviceWorker' in navigator)) throw Error('このブラウザーでは作品ページを開けません。');
  const userId=(await auth.getSession()).data.session?.user.id;
  let guestId;
  if(!userId){
    guestId=crypto.randomUUID();
    try{
      guestId=localStorage.getItem('spool-event-guest-v1')||guestId;
      localStorage.setItem('spool-event-guest-v1',guestId);
    }catch{/* Use this page's ID if browser storage is unavailable. */}
  }
  auth.onAuthStateChange((_event,session)=>{if(session?.user.id!==userId)location.reload()});
  const workerURL=new URL('./event-worker.js',location.href).href;
  navigator.serviceWorker.addEventListener('message',async event=>{
    if(event.source?.scriptURL!==workerURL || event.data!=='event-authorization' || !event.ports[0]) return;
    try{
      const {data,error}=await auth.getSession();
      event.ports[0].postMessage(error||data.session?.user.id!==userId?null:data.session?.access_token||'guest:'+guestId);
    }catch{event.ports[0].postMessage(null)}
  });
  await navigator.serviceWorker.register(workerURL,{scope:'./'});
  if(navigator.serviceWorker.controller?.scriptURL!==workerURL){
    await new Promise((resolve,reject)=>{
      const finish=()=>{
        if(navigator.serviceWorker.controller?.scriptURL!==workerURL)return;
        clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',finish);resolve();
      };
      const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',finish);reject(Error('イベントの読み込みに時間がかかっています。ページを再読み込みしてください。'))},20000);
      navigator.serviceWorker.addEventListener('controllerchange',finish);finish();
    });
  }
  await import('./app.js');
  document.querySelector('#event-loading').hidden=true;
  document.querySelector('#event-content').hidden=false;
}
start().catch(error=>{document.querySelector('#event-loading span').textContent=error.message});
