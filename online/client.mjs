import {publicConfig,authStorageKey,redactDiagnostic} from './security.mjs';
import {classifyError} from './errors.mjs';
import {createClient} from '@supabase/supabase-js';
import {LibrarySync} from './sync.mjs';
const panel=document.querySelector('#cloud-panel'),bridge=window.spoolBridge,esc=bridge.esc;
const releaseVersion=__SPOOL_VERSION__,releaseBuild=__SPOOL_BUILD__;
const empty=()=>({items:[],deleted:[],customColorPresets:[],reservations:[]});
let client,session,libraries=[],library,role,loading=false,uploading=false,timer,errorText='',errorInfo=null,authEpoch=0,configuredOrigin=null,managedConfig=false;
const sync=new LibrarySync(async(lib,revision,state)=>{
 const {data,error}=await client.rpc('save_library_state',{lib,expected_revision:revision,next_state:state});if(error)throw error;return data;
},()=>{const el=document.querySelector('#cloud-save-status');if(el){el.dataset.state=sync.conflict?'conflict':sync.busy?'busy':sync.dirty?'dirty':'saved';el.textContent=sync.conflict?'変更が競合しています':sync.busy?'オンライン保存中…':sync.dirty?'未保存の変更があります':'オンライン保存済み';}});
window.spoolOnlineChanged=()=>{sync.edit();clearTimeout(timer);timer=setTimeout(save,800)};
function errorMarkup(){if(!errorText)return '';const info=errorInfo||classifyError(errorText);return '<div class="error-summary" data-error-category="'+esc(info.category)+'"><strong>'+esc(info.title)+'</strong><p>'+esc(info.action)+'</p><details><summary>詳細</summary><pre>'+esc(redactDiagnostic(info.detail))+'</pre></details></div>'}function fail(error){errorText=error.message||String(error);errorInfo=classifyError(error);const el=document.querySelector('#cloud-error');if(el)el.innerHTML=errorMarkup();}
async function save(){try{await sync.save(bridge.snapshot());if(!sync.dirty&&!sync.conflict){errorText='';errorInfo=null;const feedback=document.querySelector('#cloud-error');if(feedback)feedback.replaceChildren()}updateBookings();if(sync.dirty&&!sync.conflict){clearTimeout(timer);timer=setTimeout(save,800)}}catch(error){fail(error)}}
function downloadState(){const text=JSON.stringify({version:2,...bridge.snapshot()},null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SPOOL-online-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function lock(){document.body.classList.add('cloud-locked');document.querySelectorAll('dialog[open]').forEach(x=>x.close());}
function render(){
 const account=session?'<details class="cloud-account"><summary aria-label="アカウントメニュー"><span class="cloud-avatar">'+esc((session.user.email||'S').slice(0,1).toUpperCase())+'</span><span class="account-caption">アカウント</span><span class="account-chevron">⌄</span></summary><div class="account-popover"><small>ログイン中</small><p>'+esc(session.user.email)+'</p><a href="./offline.html">オフライン版・以前の在庫 ↗</a><button id="cloud-logout">ログアウト</button></div></details>':'<a class="cloud-offline-link" href="./offline.html">オフライン版 ↗</a>';
 let markup='<div class="cloud-topbar"><a class="cloud-brand" href="./" aria-label="SPOOL ホーム"><span class="cloud-brand-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="7" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="currentColor"/><path d="M16 4v5m12 7h-5M16 28v-5M4 16h5" stroke="currentColor" stroke-width="2"/></svg></span><span>SPOOL<span class="cloud-brand-dot">.</span></span><small>WORKSPACE</small></a>'+(library?'<nav class="cloud-navigation" aria-label="ワークスペース"><button data-cloud-nav="inventory"><span aria-hidden="true">▦</span> フィラメント</button><button data-cloud-nav="bookings"><span aria-hidden="true">▤</span> 印刷予約</button></nav>':'<span class="cloud-topline">素材と、次のアイデアを。</span>')+account+'</div><div id="cloud-error" class="cloud-error" role="alert">'+errorMarkup()+'</div>';
 if(!client){markup+=`<p>Googleログインと招待されたライブラリで、在庫と予約を共有します。</p><form id="cloud-config"><label>SupabaseプロジェクトURL<input type="url" name="url" placeholder="https://xxxx.supabase.co" value="https://mtfmamufpaqpwsuiccoz.supabase.co" required></label><label>公開用Publishableキー<input name="key" required autocomplete="off"></label><button>接続設定を保存</button></form><p>公開用キーだけを使用してください。secret / service_roleキーは入力しないでください。設定はこのタブに保存します。</p>`;
 panel.innerHTML=markup; document.querySelector('#cloud-config').onsubmit=event=>{event.preventDefault();const data=new FormData(event.target);try{configure(String(data.get('url')),String(data.get('key')));sessionStorage.setItem('spool-online-config',JSON.stringify({url:String(data.get('url')),key:String(data.get('key'))}));start()}catch(e){fail(e)}};return;}
 if(!session){markup+='<div class="cloud-welcome"><div class="welcome-heading"><span class="cloud-kicker">SHARE YOUR NEXT PRINT</span><h1>素材が整う。<br>つくるが、はじまる。</h1><p>素材の管理から印刷の依頼まで、仲間と一緒に。</p></div><dl class="welcome-pillars" aria-label="SPOOLの意味"><div><dt><span>S</span>hare</dt><dd>仲間とつながる</dd></div><div><dt><span>P</span>rint</dt><dd>アイデアをかたちに</dd></div><div><dt><span>O</span>rganize</dt><dd>在庫を見やすく管理</dd></div><div><dt><span>O</span>rder</dt><dd>印刷の予定を整える</dd></div><div><dt><span>L</span>ibrary</dt><dd>素材の情報をひとまとめに</dd></div></dl><div class="welcome-actions"><button id="cloud-login" class="cloud-primary"><span class="google-g" aria-hidden="true">G</span>Googleでログイン<span aria-hidden="true">→</span></button><a href="./offline.html" class="welcome-offline">オフライン版・以前の在庫を開く ↗</a>'+(managedConfig?'':'<button id="cloud-config-reset" class="cloud-text-button">接続設定を変更</button>')+'</div><p class="welcome-login-note">招待されたGoogleアカウントでログインしてください。</p><details class="spool-version welcome-version" aria-label="バージョン情報"><summary>v'+esc(releaseVersion)+'</summary><p>オンライン版'+(releaseBuild?' · '+esc(releaseBuild.slice(0,7)):'')+'</p></details></div>';panel.innerHTML=markup;document.querySelector('#cloud-login').onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,scopes:'openid email profile'}});if(error)fail(error)};if(document.querySelector('#cloud-config-reset'))document.querySelector('#cloud-config-reset').onclick=()=>{sessionStorage.removeItem('spool-online-config');location.reload()};return;}
 const logout=async()=>{if(uploading){fail(Error('ファイルの保存が終わるまでお待ちください。'));return}if(sync.dirty&&!confirm('未保存の変更があります。JSONで退避してからログアウトしてください。変更を破棄してログアウトしますか？'))return;authEpoch++;lock();clearTimeout(timer);sync.reset(null);bridge.apply(empty());library=null;await client.auth.signOut();session=null;render()};
 if(!library){markup+='<p>ライブラリを読み込めませんでした。招待されたメールアドレスか確認してください。</p><button id="cloud-retry">再試行</button>';panel.innerHTML=markup;document.querySelector('#cloud-retry').onclick=()=>loadAccount();document.querySelector('#cloud-logout').onclick=logout;return;}
 markup+=`<div class="cloud-context"><label class="cloud-library-picker"><span class="library-picker-icon" aria-hidden="true">◈</span><span><small>ライブラリ</small><select id="cloud-library" aria-label="ライブラリ">${libraries.map(x=>`<option value="${esc(x.id)}" ${x.id===library?'selected':''}>${esc(x.name)}${x.owner_id===session.user.id?'':'（共有）'}</option>`).join('')}</select></span></label><span class="cloud-role">${role==='viewer'?'閲覧のみ':role==='owner'?'自分のライブラリ':'共同編集'}</span><span id="cloud-save-status" class="cloud-sync-state" role="status"></span><div class="cloud-context-actions"><button id="cloud-save" class="cloud-save-button" ${role==='viewer'?'disabled':''}>↥ <span>保存</span></button><button data-open-tools="data" class="cloud-tool-button">管理</button></div></div>`;
 markup+='<dialog id="cloud-tools-dialog" class="cloud-tools-dialog"><div class="cloud-dialog-head"><div><small>WORKSPACE SETTINGS</small><h2>ライブラリの管理</h2></div><button type="button" data-close-cloud-tools aria-label="管理画面を閉じる">×</button></div><div class="cloud-dialog-body"><section class="cloud-data-section"><h3>データとバックアップ</h3><p>変更は自動でオンラインに保存されます。大切なデータはJSONでも保管できます。</p><div class="cloud-data-actions"><button id="cloud-export">↓ JSONで退避</button><button id="cloud-reload">↻ 最新を読み込む</button></div></section>';
 markup+=`<details data-tool-section="data"><summary>JSONから取り込み</summary><p>現在のライブラリ全体を置き換えます。既存データは事前にJSONで退避してください。オフライン版のデータを自動で送信することはありません。</p><input type="file" id="cloud-import" accept=".json,application/json" ${role==='viewer'?'disabled':''}></details>`;
 if(role==='owner')markup+=`<details data-tool-section="members"><summary>メンバー・招待を管理</summary><form id="cloud-invite"><input name="email" type="email" placeholder="共有相手のGoogleメール" required><select name="role"><option value="editor">閲覧・編集</option><option value="viewer">閲覧のみ</option></select><button>招待を登録</button></form><p>招待メールは自動送信しません。相手にSPOOLのURLを伝え、指定したGoogleアカウントでログインしてもらってください。</p><ul id="cloud-members"></ul><ul id="cloud-invites"></ul></details>`;
 markup+=`<details data-tool-section="files"><summary>予約の添付ファイル</summary><p>オンライン保存は1ファイル100MBまで。ローカル参照は予約の編集画面で登録します。</p><select id="cloud-booking"><option value="">予約を選択</option>${bridge.snapshot().reservations.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select><input id="cloud-upload" type="file" accept=".stl,.obj,.3mf,.amf,.step,.stp,.gcode" ${role==='viewer'?'disabled':''}><ul id="cloud-files"></ul></details>`;
 markup+='</div></dialog>';panel.innerHTML=markup;
 const tools=document.querySelector('#cloud-tools-dialog');
 panel.querySelectorAll('[data-open-tools]').forEach(button=>button.onclick=()=>{tools.querySelectorAll('details').forEach(d=>d.open=false);tools.querySelector('.cloud-data-section').hidden=button.dataset.openTools!=='data';tools.showModal()});
 panel.querySelector('[data-close-cloud-tools]').onclick=()=>tools.close();
 tools.addEventListener('click',event=>{if(event.target===tools){const r=tools.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)tools.close()}});
 panel.querySelectorAll('[data-cloud-nav]').forEach(button=>button.onclick=()=>{bridge.navigate(button.dataset.cloudNav==='bookings');updateCloudNavigation()});
 updateCloudNavigation();
 document.querySelector('#cloud-logout').onclick=logout;
 document.querySelector('#cloud-library').onchange=e=>loadLibrary(e.target.value);
 document.querySelector('#cloud-save').onclick=save;
 document.querySelector('#cloud-reload').onclick=()=>loadLibrary(library,true);
 document.querySelector('#cloud-export').onclick=downloadState;
 document.querySelector('#cloud-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw Error('JSONは10MB以下にしてください');const data=JSON.parse(await file.text());if(![1,2].includes(data.version))throw Error('未対応のJSON形式です');const state={items:data.items,reservations:data.reservations||[],customColorPresets:data.customColorPresets||[],deleted:data.deleted||[]};if(!bridge.valid(state))throw Error('データ形式が不正です');if(!confirm('現在のライブラリ全体をこのJSONで置き換えますか？'))return;bridge.apply(state);sync.edit();await save();render()}catch(error){fail(error)}};
 if(role==='owner'){document.querySelector('#cloud-invite').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const {error}=await client.rpc('invite_library_member',{lib:library,target_email:d.get('email'),member_role:d.get('role')});if(error)fail(error);else{e.target.reset();await loadMembers()}};loadMembers().catch(fail);}
 document.querySelector('#cloud-booking').onchange=()=>loadFiles().catch(fail);
 document.querySelector('#cloud-upload').onchange=upload;
 sync.changed();
}
function updateCloudNavigation(){const bookings=!document.querySelector('#bookingView').hidden;panel.querySelectorAll('[data-cloud-nav]').forEach(button=>{const active=(button.dataset.cloudNav==='bookings')===bookings;button.classList.toggle('is-active',active);button.setAttribute('aria-current',active?'page':'false')})}
function configure(url,key){
 const config=publicConfig({url,key},configuredOrigin);sessionStorage.removeItem('sb-'+new URL(config.url).hostname.split('.')[0]+'-auth-token');client=createClient(config.url,config.key,{auth:{flowType:'pkce',storage:sessionStorage,storageKey:authStorageKey(config.url),persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}

async function start(){client.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){session=null;authEpoch++;lock();sync.reset(null);bridge.apply(empty());library=null;render()}else if(s&&(!session||session.user.id!==s.user.id)){session=s;setTimeout(()=>loadAccount().catch(fail),0);}else session=s;});const {data,error}=await client.auth.getSession();if(error)fail(error);if(!session&&data.session){session=data.session;await loadAccount()}else render();}
async function loadAccount(){const epoch=++authEpoch;lock();library=null;sync.reset(null);bridge.apply(empty());try{const {data,error}=await client.rpc('ensure_my_library');if(error)throw error;const result=await client.from('libraries').select('*').order('created_at');if(result.error)throw result.error;if(epoch!==authEpoch)return;libraries=result.data;await loadLibrary(data)}catch(error){if(epoch===authEpoch){fail(error);render()}}}
async function loadLibrary(id,force=false){
 if(loading||sync.busy||uploading)return;
 if(sync.dirty&&!confirm('未保存の変更があります。JSONで退避してから読み直してください。変更を破棄しますか？')){render();return;}
 const epoch=authEpoch;loading=true;lock();clearTimeout(timer);
 try {const [{data,error},membership]=await Promise.all([client.from('library_state').select('*').eq('library_id',id).single(),client.from('library_members').select('role').eq('library_id',id).eq('user_id',session.user.id).single()]);if(error)throw error;if(membership.error)throw membership.error;if(epoch!==authEpoch)return;
 bridge.apply(data.state);library=id;role=membership.data.role;sync.reset(id,data.revision);errorText='';errorInfo=null;render();document.body.classList.remove('cloud-locked');document.body.classList.toggle('cloud-viewer',role==='viewer');
 for(const selector of ['#add','#addBooking','#openLibrary','#emptyAddBooking','#undoDelete','#bulkAdd','#bulkDelete','#toggleReorder'])document.querySelector(selector).disabled=role==='viewer';
 }catch(error){if(epoch===authEpoch){fail(error);render()}}finally{loading=false}
}
async function loadMembers(){const lib=library;const members=await client.from('library_members').select('*').eq('library_id',lib);const invites=await client.from('library_invitations').select('*').eq('library_id',lib);if(lib!==library)return;if(members.error)throw members.error;if(invites.error)throw invites.error;
 const list=document.querySelector('#cloud-members'),pending=document.querySelector('#cloud-invites');if(!list||!pending)return;
 list.replaceChildren(...members.data.map(member=>{const li=document.createElement('li');li.textContent=`${member.user_id===session.user.id?'自分':member.user_id} — ${member.role} `;if(member.role!=='owner'){const button=document.createElement('button');button.textContent='共有を解除';button.onclick=async()=>{const {error}=await client.rpc('remove_library_member',{lib,target_user:member.user_id});if(error)fail(error);else loadMembers().catch(fail)};li.append(button)}return li}));
 pending.replaceChildren(...invites.data.map(invite=>{const li=document.createElement('li');li.textContent=`招待中: ${invite.email} — ${invite.role} `;const button=document.createElement('button');button.textContent='招待取消';button.onclick=async()=>{const {error}=await client.from('library_invitations').delete().eq('library_id',lib).eq('email',invite.email);if(error)fail(error);else loadMembers().catch(fail)};li.append(button);return li}));
}
function updateBookings(){const select=document.querySelector('#cloud-booking');if(!select)return;const previous=select.value;select.innerHTML='<option value="">予約を選択</option>'+bridge.snapshot().reservations.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('');select.value=previous;}
async function upload(e){const file=e.target.files[0],booking=document.querySelector('#cloud-booking').value,lib=library;if(!file||uploading)return;uploading=true;e.target.disabled=true;try{
 if(!booking)throw Error('予約を選択してください');if(sync.dirty||sync.busy)throw Error('先に予約をオンライン保存してください');if(file.size<1||file.size>104857600||file.name.length>240||!/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(file.name))throw Error('対応形式・100MB以下のファイルを選択してください');
 const id=crypto.randomUUID(),object_path=`${lib}/${id}/model`;const meta=await client.from('library_files').insert({id,library_id:lib,booking_id:booking,name:file.name,size:file.size,object_path});if(meta.error)throw meta.error;
 const result=await client.storage.from('spool-models').upload(object_path,file,{contentType:'application/octet-stream',upsert:false});if(result.error){await client.from('library_files').delete().eq('id',id);throw result.error}await loadFiles();
 }catch(error){fail(error)}finally{uploading=false;e.target.value='';e.target.disabled=role==='viewer'}}
async function loadFiles(){const lib=library,booking=document.querySelector('#cloud-booking').value;const {data,error}=await client.from('library_files').select('*').eq('library_id',lib).eq('booking_id',booking);if(error)throw error;if(lib!==library)return;document.querySelector('#cloud-files').replaceChildren(...data.map(file=>{const li=document.createElement('li');li.textContent=`${file.name} (${Math.ceil(file.size/1024)} KB) `;const open=document.createElement('button');open.textContent='取得';open.onclick=async()=>{const {data,error}=await client.storage.from('spool-models').createSignedUrl(file.object_path,60,{download:file.name});if(error)fail(error);else{const a=document.createElement('a');a.href=data.signedUrl;a.rel='noopener noreferrer';a.click()}};li.append(open);if(role!=='viewer'){const remove=document.createElement('button');remove.textContent='削除';remove.onclick=async()=>{if(!confirm('添付ファイルを削除しますか？'))return;const result=await client.storage.from('spool-models').remove([file.object_path]);if(result.error){fail(result.error);return}const meta=await client.from('library_files').delete().eq('id',file.id);if(meta.error)fail(meta.error);else loadFiles().catch(fail)};li.append(remove)}return li}));}
// Reservation form uploads use the same private bucket and membership policies.
window.spoolBookingFileUpload=async(bookingId,files)=>{
 if(!library||role==='viewer'||uploading)throw Error('ファイルを保存できる状態ではありません。');
 const lib=library,epoch=authEpoch,uploaded=[];uploading=true;clearTimeout(timer);
 const picker=document.querySelector('#cloud-library');if(picker)picker.disabled=true;
 try{
  for(let attempt=0;sync.busy&&attempt<150;attempt++)await new Promise(resolve=>setTimeout(resolve,100));
  if(sync.busy)throw Error('予約の保存が完了してから、もう一度お試しください。');
  await save();if(sync.dirty||sync.busy||sync.conflict)throw Error('先に予約のオンライン保存を確認してください。');
  for(const file of files){
   if(library!==lib||authEpoch!==epoch)throw Error('ログイン状態が変わりました。保存状態を確認してください。');
   if(!/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(file.name)||file.name.length>240||file.size<1||file.size>104857600)throw Error('対応形式・100MB以下のファイルを指定してください。');
   const id=crypto.randomUUID(),object_path=`${lib}/${id}/model`;
   const meta=await client.from('library_files').insert({id,library_id:lib,booking_id:bookingId,name:file.name,size:file.size,object_path});if(meta.error)throw meta.error;
   const result=await client.storage.from('spool-models').upload(object_path,file,{contentType:'application/octet-stream',upsert:false});
   if(result.error){await client.from('library_files').delete().eq('id',id);throw result.error}
   uploaded.push({id,name:file.name,size:file.size,kind:'online'});
  }
  return uploaded;
 }catch(error){const failure=Error(error.message||'添付の保存に失敗しました。');failure.uploadedAttachments=uploaded;failure.remainingFiles=files.slice(uploaded.length);throw failure}
 finally{uploading=false;if(picker)picker.disabled=false}
};
window.spoolDownloadBookingAttachment=async id=>{if(!session||!library)throw Error('ログインして添付を取得してください。');const meta=await client.from('library_files').select('*').eq('id',id).eq('library_id',library).single();if(meta.error)throw meta.error;const result=await client.storage.from('spool-models').createSignedUrl(meta.data.object_path,60,{download:meta.data.name});if(result.error)throw result.error;const a=document.createElement('a');a.href=result.data.signedUrl;a.rel='noopener noreferrer';a.click()};

// Online uses only authenticated state; offline data-management controls are not used.
for(const id of ['#navData','#manageData','#quickSave','#saveStatusSummary'])document.querySelector(id).hidden=true;
document.querySelector('.side-bottom').textContent='オンライン共有ライブラリ';
document.querySelector('.footnote').textContent='商品ライブラリから素材を選んで登録。変更はオンラインへ自動保存されます。';
window.addEventListener('beforeunload',e=>{if(sync.dirty||uploading){e.preventDefault();e.returnValue=''}});
setInterval(async()=>{if(!library||sync.dirty||sync.busy||loading||document.querySelector('dialog[open]'))return;try{const lib=library;const {data,error}=await client.from('library_state').select('revision').eq('library_id',lib).single();if(error){lock();throw error}if(lib===library&&data.revision!==sync.revision)await loadLibrary(lib)}catch(error){fail(error)}},15000);
try{
 if(window.top!==window.self){lock();panel.innerHTML='<div class="cloud-welcome"><h1>SPOOLを直接開いてください</h1><p>安全のため、埋め込み画面ではログインできません。</p><a class="cloud-primary" href="./" target="_blank" rel="noopener noreferrer">別のタブで開く ↗</a></div>'}
 else{
  const response=await fetch('./config.json',{cache:'no-store'});if(!response.ok)throw Error('公開された接続設定を読み込めません');const supplied=await response.json();
  configuredOrigin=new URL(supplied.url).origin;let config;
  if(supplied.key){config=publicConfig(supplied);managedConfig=true;sessionStorage.removeItem('spool-online-config')}
  else{const cached=JSON.parse(sessionStorage.getItem('spool-online-config')||'null');if(cached)config=publicConfig(cached,configuredOrigin)}
  if(config){configure(config.url,config.key);await start()}else render();
 }
}catch(error){fail(error);render()}
