import {classifyError} from './errors.mjs';
export function createLibraryLifecycle({context,esc,prepare,completed,backup}){
 return async function open(mode){
  const c=context(),deleting=mode==='delete';
  if(!c.active||c.active.personal!==false||(deleting&&c.active.owner_id!==c.user))return;
  if(!deleting&&c.active.owner_id===c.user)return;
  document.querySelector('#library-lifecycle-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='library-lifecycle-dialog';dialog.className='cloud-tools-dialog lifecycle-dialog';dialog.setAttribute('aria-labelledby','lifecycleTitle');
  dialog.innerHTML='<div class="cloud-dialog-head"><h2 id="lifecycleTitle">'+(deleting?'共有ライブラリを完全削除':'共有ライブラリから退出')+'</h2><button type="button" data-close-lifecycle aria-label="閉じる">×</button></div><form id="libraryLifecycleForm" class="cloud-dialog-body"><h3>'+esc(c.active.name)+'</h3><p>'+(deleting?'この共有ライブラリの在庫・予約・添付本体・履歴・参加設定を削除します。このライブラリから他への共有表示も終了します。元に戻せません。個人ライブラリや他の共有元の原本は削除しません。':'このライブラリの閲覧・編集ができなくなり、自分の原本からこのライブラリへの共有を停止します。個人ライブラリの原本や、ここに登録済みの在庫・予約は残ります。再参加には管理者の招待が必要です。')+'</p>'+(deleting?'<button type="button" id="lifecycle-backup">JSONをバックアップ</button><p class="lifecycle-hint">JSONにオンライン添付の本体は含まれません。必要な添付は先に取得してください。</p><label>削除するライブラリ名を入力<input id="lifecycle-name" autocomplete="off" required></label>':'')+'<p id="lifecycle-result" role="status">'+(deleting?'削除対象を確認しています…':'退出後は個人ライブラリへ移動します。')+'</p><button type="button" id="lifecycle-retry" hidden>対象を再確認</button></form><div class="lifecycle-footer"><button type="submit" form="libraryLifecycleForm" id="lifecycle-submit" class="lifecycle-danger" '+(deleting?'disabled':'')+'>'+(deleting?'完全削除の最終確認へ':'退出する')+'</button></div>';
  document.querySelector('#cloud-panel').append(dialog);dialog.showModal();
  let info=null,busy=false,removed=false,operationSent=false;const result=dialog.querySelector('#lifecycle-result'),submit=dialog.querySelector('#lifecycle-submit'),retry=dialog.querySelector('#lifecycle-retry'),input=dialog.querySelector('#lifecycle-name');
  const current=()=>context().epoch===c.epoch&&context().library===c.library&&dialog.open;
  dialog.querySelector('[data-close-lifecycle]').onclick=()=>{if(!busy)dialog.close()};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
  if(input)input.oninput=()=>{submit.disabled=!info||input.value!==info.name};
  dialog.querySelector('#lifecycle-backup')?.addEventListener('click',backup);
  async function load(){info=null;submit.disabled=true;retry.hidden=true;try{const response=await c.client.rpc('get_shared_library_deletion_info',{lib:c.library});if(response.error)throw response.error;if(!current())return;info=response.data;if(info.name!==c.active.name)throw Error('ライブラリ名が変わりました。開き直してください。');result.textContent='オンライン添付 '+info.object_paths.length+' 件を含みます。名前入力後、最終確認を表示します。';submit.disabled=input.value!==info.name;}catch(error){if(!current())return;result.textContent=error.code==='PGRST202'?'削除機能にはDB更新が必要です。upgrade-existing.sqlを適用してください。':error.message;retry.hidden=false;}}
  retry.onclick=load;if(deleting)void load();
  dialog.querySelector('form').onsubmit=async event=>{
   event.preventDefault();if(busy||(deleting&&(!info||input.value!==info.name)))return;
   if(!confirm(deleting?'最終確認：「'+info.name+'」を添付本体も含めて完全削除します。元に戻せません。実行しますか？':'「'+c.active.name+'」から退出しますか？'))return;
   busy=true;for(const el of dialog.querySelectorAll('button,input'))el.disabled=true;
   try{
    await prepare();if(!current())return;
    if(deleting){
     // Recheck DB support, revision and all file paths before any Storage deletion.
     const fresh=await c.client.rpc('get_shared_library_deletion_info',{lib:c.library});if(fresh.error)throw fresh.error;
     if(fresh.data.name!==info.name||fresh.data.revision!==info.revision)throw Object.assign(Error('Library changed; reload before deleting'),{code:'40001'});
     if(!current())return;
     for(let i=0;i<fresh.data.object_paths.length;i+=100){const paths=fresh.data.object_paths.slice(i,i+100);result.textContent='添付ファイルを削除しています…';removed=true;const response=await c.client.storage.from('spool-models').remove(paths);if(response.error)throw response.error;removed=true;if(!current())return;}
     result.textContent='ライブラリを削除しています…';operationSent=true;const response=await c.client.rpc('delete_shared_library',{lib:c.library,confirmation_name:info.name,expected_revision:info.revision,confirmed:true});if(response.error)throw response.error;
    }else{operationSent=true;const response=await c.client.rpc('leave_shared_library',{lib:c.library});if(response.error)throw response.error;}
    if(current()){dialog.close();await completed(c.library,deleting);}
   }catch(error){if(current()){const feedback=classifyError(error);result.textContent=(removed?'添付の一部は削除済みの可能性があります。':'')+(operationSent&&feedback.category==='network'?'処理の結果を確認できません。最新のライブラリ一覧を再読み込みして確認してください。':(removed?'ライブラリの削除は完了していません。':'')+(error.code==='LOCAL_CHANGES'?error.message:error.code==='PGRST202'?'この機能にはDB更新が必要です。upgrade-existing.sqlを適用してください。':feedback.title+'。'+feedback.action));}}
   finally{busy=false;for(const el of dialog.querySelectorAll('button,input'))el.disabled=false;if(input)submit.disabled=!info||input.value!==info.name;}
  };
 };
}
