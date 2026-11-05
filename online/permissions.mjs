import {sameState} from './network.mjs';
export const CAPABILITIES=[
 ['inventory_create','在庫','フィラメントを追加'],['inventory_edit','在庫','商品情報・残量を編集'],['inventory_delete','在庫','フィラメントを削除'],['inventory_use','在庫','残量を記録（商品編集なしでも許可）'],
 ['bookings_create','予約','予約を追加'],['bookings_edit','予約','予約・印刷状態を編集'],['bookings_delete','予約','予約を削除'],
 ['files_upload','添付','ファイルを追加'],['files_delete','添付','ファイル・添付情報を削除'],['sharing_manage','共有','共有先にフィラメントを追加・変更'],
];
export function rolePermissions(role){return Object.fromEntries(CAPABILITIES.map(([key])=>[key,role==='owner'||role==='editor']))}
export function validPermissions(value){return value&&typeof value==='object'&&!Array.isArray(value)&&CAPABILITIES.every(([key])=>typeof value[key]==='boolean')}
export function assertStatePermissions(previous,next,permissions){
 const need=key=>{if(!permissions[key])throw Error('権限がありません：'+(CAPABILITIES.find(x=>x[0]===key)?.[2]||key));};
 for(const [section,prefix] of [['items','inventory'],['reservations','bookings']]){
  const before=(previous[section]||[]).filter(x=>!x._sharedSource),after=(next[section]||[]).filter(x=>!x._sharedSource),old=new Map(before.map(x=>[x.id,x])),upcoming=new Map(after.map(x=>[x.id,x]));let changed=false;
  for(const id of new Set([...old.keys(),...upcoming.keys()])){const a=old.get(id),b=upcoming.get(id);if(sameState(a,b))continue;changed=true;
   if(!a)need(prefix+'_create');else if(!b)need(prefix+'_delete');else if(section==='items'&&sameState({...a,remaining:0},{...b,remaining:0})){if(!permissions.inventory_edit)need('inventory_use');}else need(prefix+'_edit');
   if(section==='reservations'){for(const f of b?.attachments||[])if(!(a?.attachments||[]).some(x=>sameState(x,f)))need('files_upload');for(const f of a?.attachments||[])if(!(b?.attachments||[]).some(x=>sameState(x,f)))need('files_delete');}
  }
  if(!changed&&!sameState(before,after))need(prefix+'_edit');
 }
 if(!sameState(previous.customColorPresets,next.customColorPresets))need('inventory_edit');
 if(!sameState(previous.deleted,next.deleted)&&!permissions.inventory_create)need('inventory_delete');
}
export async function fetchPermissions(client,library,role){
 const response=await client.rpc('get_my_library_permissions',{lib:library});
 if(response.error){if(response.error.code==='PGRST202')return rolePermissions(role);throw response.error;}
 if(!validPermissions(response.data))throw Error('操作権限を確認できませんでした。再読み込みしてください。');return response.data;
}
export function createPermissionEditor({context,esc,changed}){
 return async function open(member){
  const c=context();if(!c.admin||c.active?.personal!==false||member.role==='owner')return;
  document.querySelector('#member-permissions-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='member-permissions-dialog';dialog.className='cloud-tools-dialog permission-dialog';dialog.setAttribute('aria-labelledby','memberPermissionsTitle');
  dialog.innerHTML='<div class="cloud-dialog-head"><div><small>MEMBER PERMISSIONS</small><h2 id="memberPermissionsTitle">操作権限</h2></div><button type="button" data-close-permissions aria-label="閉じる">×</button></div><form id="memberPermissionForm" class="cloud-dialog-body"><p><strong>'+esc(member.display_name||'メンバー')+'</strong> '+esc(member.display_id?'@'+member.display_id:'')+'</p><p>'+esc(c.active.name)+'（共有用）</p><label class="permission-choice permission-admin"><input type="checkbox" id="permission-admin" disabled><span>共有管理者にする<small>参加者の権限変更・管理者追加が可能です</small></span></label><p id="permission-admin-note" hidden>管理者の追加にはDB更新が必要です。library-administrators.sqlを適用してください。</p><label>基本設定<select id="permission-preset"><option value="viewer">閲覧のみ</option><option value="editor">すべて編集可</option><option value="custom">操作を個別設定</option></select></label><p>管理者はこの共有ライブラリ全体を管理できます。通常の参加者は自分の制限を変更できません。</p><details class="permission-help"><summary>操作権限の補足</summary><p>閲覧範囲は全メンバー共通です。商品編集は残量変更を含みます。予約への添付には予約編集とファイル追加の両方が必要です。</p></details><div id="permission-groups">'+[...new Set(CAPABILITIES.map(x=>x[1]))].map(group=>'<fieldset><legend>'+esc(group)+'</legend>'+CAPABILITIES.filter(x=>x[1]===group).map(([key,,label])=>'<label class="permission-choice"><input type="checkbox" data-permission="'+key+'">'+esc(label)+'</label>').join('')+'</fieldset>').join('')+'</div><p id="permission-result" role="status">読み込んでいます…</p></form><div class="permission-footer"><button type="submit" form="memberPermissionForm" id="permission-save" class="cloud-primary" disabled>権限を保存</button></div>';
  document.querySelector('#cloud-panel').append(dialog);dialog.showModal();let busy=false,ready=false,supportsAdmins=false;
  const administrator=dialog.querySelector('#permission-admin');const controls=[...dialog.querySelectorAll('[data-permission]')],preset=dialog.querySelector('#permission-preset'),result=dialog.querySelector('#permission-result'),save=dialog.querySelector('#permission-save');
  for(const control of controls)control.disabled=true;preset.disabled=true;
  dialog.querySelector('[data-close-permissions]').onclick=()=>{if(!busy)dialog.close()};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
  const apply=mode=>{if(administrator.checked){preset.value='editor';mode='editor'}preset.disabled=administrator.checked;for(const control of controls){if(mode!=='custom')control.checked=mode==='editor';control.disabled=mode!=='custom'||administrator.checked;}};
  preset.onchange=()=>apply(preset.value);administrator.onchange=()=>apply(preset.value);
  try{const response=await c.client.rpc('get_library_member_permissions',{lib:c.library});if(response.error)throw response.error;if(context().epoch!==c.epoch||!dialog.isConnected)return;const row=response.data.find(x=>x.user_id===member.user_id);if(!row)throw Error('このメンバーは参加していません。');supportsAdmins=typeof row.is_library_admin==='boolean';administrator.checked=row.is_library_admin===true;administrator.disabled=!supportsAdmins;dialog.querySelector('#permission-admin-note').hidden=supportsAdmins;preset.value=row.role==='viewer'?'viewer':row.permissions?'custom':'editor';for(const input of controls)input.checked=row.permissions?.[input.dataset.permission]===true;apply(preset.value);save.disabled=false;ready=true;result.textContent='保存後、このライブラリでの操作に適用されます。';}
  catch(error){result.textContent=error.code==='PGRST202'?'個別権限の設定にはDB更新が必要です。member-permissions.sqlを適用してください。':error.message;}
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!ready||busy)return;busy=true;save.disabled=true;for(const el of dialog.querySelectorAll('input,select,button'))el.disabled=true;result.textContent='保存しています…';try{if(administrator.checked&&!confirm('この参加者を「'+c.active.name+'」の管理者にします。参加者の権限変更と管理者追加も行えるようになります。よろしいですか？'))return;const response=await c.client.rpc(supportsAdmins?'set_library_member_access':'set_library_member_permissions',{lib:c.library,target_user:member.user_id,member_role:preset.value==='viewer'?'viewer':'editor',grants:preset.value==='custom'?Object.fromEntries(controls.map(x=>[x.dataset.permission,x.checked])):null,...supportsAdmins?{administrator:administrator.checked}:{}});if(response.error)throw response.error;if(context().epoch!==c.epoch||context().library!==c.library)return;dialog.close();await changed();}catch(error){result.textContent=error.code==='PGRST202'?'管理者設定にはlibrary-administrators.sqlのDB更新が必要です。':error.message||'権限を保存できませんでした。';}finally{busy=false;for(const el of dialog.querySelectorAll('button'))el.disabled=false;administrator.disabled=!supportsAdmins;apply(preset.value);}};
 };
}
