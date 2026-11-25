// Installation is user initiated. No user records or tokens enter the app cache.
export function createWebApp({canReload=()=>true}={}){
 let prompt=null,registration=null,waiting=false,reloading=false,notice='';
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const root=document.createElement('section');root.className='pwa-controls';root.setAttribute('aria-label','Webアプリ');
 const guide=document.createElement('dialog');guide.className='cloud-tools-dialog pwa-guide';guide.setAttribute('aria-labelledby','pwa-guide-title');
 guide.innerHTML='<div class="cloud-dialog-head"><h2 id="pwa-guide-title">SPOOLをアプリとして追加</h2><button type="button" data-pwa-close aria-label="閉じる">×</button></div><div class="cloud-dialog-body"><p>ホーム画面やアプリ一覧から、SPOOLを開けます。</p><dl><dt>iPhone・iPad</dt><dd>ブラウザーの共有メニュー →「ホーム画面に追加」。表示される場合は「Webアプリとして開く」をオンにします。</dd><dt>Android（Chrome・Edgeなど）</dt><dd>ブラウザーのメニュー →「アプリをインストール」または「ホーム画面に追加」。</dd><dt>PC（Chrome・Edge）</dt><dd>アドレスバーのインストールボタン、またはブラウザーメニューの「アプリ」から追加します。</dd><dt>Mac（Safari）</dt><dd>対応するmacOSでは「ファイル」→「Dockに追加」。</dd><dt>インストールが表示されないブラウザー</dt><dd>ブックマークやショートカットとして利用できます。対応する最新ブラウザーでもお試しください。</dd></dl><p>オンラインの在庫・予約には通信が必要です。ログイン状態の保持は、このブラウザー／アプリ側の設定に従います。</p><p class="pwa-result" role="status"></p></div>';
 guide.querySelector('[data-pwa-close]').onclick=()=>guide.close();document.body.append(guide);
 function draw(){root.innerHTML=(standalone()?'<span class="pwa-installed">アプリで利用中</span>':'<button type="button" data-pwa-install>アプリとして追加</button>')+(waiting?'<button type="button" data-pwa-update>新しいバージョンに更新</button>':'')+'<p role="status" class="pwa-notice"></p>';root.querySelector('.pwa-notice').textContent=notice;const button=root.querySelector('[data-pwa-install]');if(button)button.onclick=install;const update=root.querySelector('[data-pwa-update]');if(update)update.onclick=applyUpdate;}
 function mount(){const target=document.querySelector('#cloud-account-dialog .account-more')||document.querySelector('.welcome-actions');if(target){target.append(root);draw();}}
 async function install(){if(!prompt){guide.querySelector('.pwa-result').textContent='';guide.showModal();return;}const pending=prompt;prompt=null;try{await pending.prompt();const choice=await pending.userChoice;notice=choice.outcome==='accepted'?'追加の操作を受け付けました。端末側の表示をご確認ください。':'追加をキャンセルしました。ブラウザーのメニューからも追加できます。';}catch{notice='ブラウザーのメニューから追加してください。';guide.showModal();}draw();}
 function applyUpdate(){if(!canReload()){notice='編集中の内容を保存し、入力画面を閉じてから更新してください。';draw();return;}if(!registration?.waiting){location.reload();return;}reloading=true;registration.waiting.postMessage({type:'SPOOL_ACTIVATE_UPDATE'});}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;mount()});window.addEventListener('appinstalled',()=>{prompt=null;notice='アプリの追加を受け付けました。';mount()});
 matchMedia('(display-mode: standalone)').addEventListener?.('change',mount);
 const pageBuild=document.querySelector('meta[name="spool-build"]')?.content;
 let checkId=0;
 function checkUpdate(worker,activated=false){
  const id=++checkId;
  waiting=false;mount();
  if(!worker||!pageBuild)return;
  const channel=new MessageChannel();
  const timer=setTimeout(()=>channel.port1.close(),3000);
  channel.port1.onmessage=event=>{
   clearTimeout(timer);channel.port1.close();
   if(id!==checkId)return;
   waiting=typeof event.data==='string'&&event.data!==pageBuild;
   if(waiting&&activated)notice='新しいバージョンを利用できます。入力内容を保存してから更新してください。';
   mount();
  };
  worker.postMessage({type:'SPOOL_BUILD'},[channel.port2]);
 }
 async function start(){
  if(window.top!==window.self||!('serviceWorker' in navigator)||!isSecureContext)return;
  try{
   const base=new URL('./',import.meta.url);
   registration=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'});
   function watchInstall(worker){
    worker?.addEventListener('statechange',()=>{
     if(worker.state==='installed')checkUpdate(registration.waiting||worker);
    });
   }
   registration.addEventListener('updatefound',()=>watchInstall(registration.installing));
   watchInstall(registration.installing);
   checkUpdate(registration.waiting);
   navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading&&canReload()){location.reload();return;}
    reloading=false;
    checkUpdate(registration.waiting||navigator.serviceWorker.controller,true);
   });
  }catch{notice='アプリの追加はブラウザーのメニューからお試しください。';mount();}
 }
 void start();return {mount};
}
