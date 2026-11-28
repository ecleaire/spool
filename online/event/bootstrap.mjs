import {eventMember,forgetEventMember} from './entry.mjs';
import {startGalleryReads} from './release/gallery-requests.js';
import {createRememberedAuthStorage} from '../auth-storage.mjs';
import {authStorageKey} from '../security.mjs';

const parsed=document.readyState==='loading'
  ? new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}))
  : Promise.resolve();
const config=__EVENT_CONFIG__;
const key=authStorageKey(config.url);
function guestToken(){
  let id=crypto.randomUUID();
  try{
    id=localStorage.getItem('spool-event-guest-v1')||id;
    localStorage.setItem('spool-event-guest-v1',id);
  }catch{/* Storage can be unavailable in private browsing. */}
  return 'guest:'+id;
}

async function prepareAuthorization(){
  const member=eventMember();
  const guest=()=>{const token=guestToken();return ()=>token};
  if(!member)return guest();

  const {storage}=createRememberedAuthStorage({key});
  const storedMember=()=>{
    try{return JSON.parse(storage.getItem(key))?.user?.id}catch{return null}
  };
  if(storedMember()!==member){forgetEventMember();return guest()}
  const {createEventAuth}=await import('./auth-client.js');
  const auth=createEventAuth(config,key,storage);
  const {data}=await auth.getSession();
  if(data.session?.user.id!==member){forgetEventMember();return guest()}
  await parsed;
  document.body.removeAttribute('data-guest-navigation');
  let ended=false;
  function endVisit(){
    if(ended)return;
    ended=true;
    forgetEventMember();
    location.reload();
  }
  auth.onAuthStateChange((_event,session)=>{if(session?.user.id!==member)endVisit()});
  window.addEventListener('pageshow',()=>{if(storedMember()!==member)endVisit()});
  return async()=>{
    const {data,error}=await auth.getSession();
    if(data.session?.user.id!==member){endVisit();return null}
    return ended||error?null:data.session.access_token;
  };
}

async function controlWorker(workerURL){
  if(navigator.serviceWorker.controller?.scriptURL!==workerURL){
    await navigator.serviceWorker.register(workerURL,{scope:'./'});
    await new Promise((resolve,reject)=>{
      const finish=()=>{
        if(navigator.serviceWorker.controller?.scriptURL!==workerURL)return;
        clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',finish);resolve();
      };
      const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',finish);reject(Error('イベントの読み込みに時間がかかっています。ページを再読み込みしてください。'))},20000);
      navigator.serviceWorker.addEventListener('controllerchange',finish);finish();
    });
  }
}

async function start(){
  if(!('serviceWorker' in navigator))throw Error('このブラウザーでは作品ページを開けません。');
  const workerURL=new URL('./event-worker.js',location.href).href;
  const authorization=prepareAuthorization();
  navigator.serviceWorker.addEventListener('message',async event=>{
    if(event.source?.scriptURL!==workerURL || event.data!=='event-authorization' || !event.ports[0])return;
    try{
      const authorize=await authorization;
      event.ports[0].postMessage(await authorize());
    }catch{event.ports[0].postMessage(null)}
  });
  await Promise.all([authorization,controlWorker(workerURL)]);
  const reads=startGalleryReads();
  await parsed;
  const {startGallery}=await import('./gallery.js');
  await startGallery(reads);
}
start().catch(async error=>{
  await parsed;
  const unsupported=!('serviceWorker' in navigator);
  document.querySelector('#event-loading span').textContent=unsupported
    ? error.message
    : '最新の案内と応募作品を読み込めませんでした。通信状態を確認して再読み込みしてください。';
});
