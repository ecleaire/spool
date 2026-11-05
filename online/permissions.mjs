import {sameState} from './network.mjs';
import {classifyError} from './errors.mjs';
export const CAPABILITIES=[
 ['inventory_create','在庫','フィラメントを追加'],['inventory_edit','在庫','商品情報・残量を編集'],['inventory_delete','在庫','フィラメントを削除'],['inventory_use','在庫','残量を記録（商品編集なしでも許可）'],
 ['purchase_create','購入予定','購入予定を追加'],['purchase_edit','購入予定','購入予定を編集'],['wishlist_create','購入希望','購入希望を追加'],['wishlist_edit','購入希望','購入希望を編集'],
 ['bookings_create','予約','予約を追加'],['bookings_edit','予約','予約・印刷状態を編集'],['bookings_delete','予約','予約を削除'],
 ['files_upload','添付','ファイルを追加'],['files_delete','添付','ファイル・添付情報を削除'],['sharing_manage','共有','共有先にフィラメントを追加・変更'],
];
export const itemPermission=(item,action)=>(item?.inventoryStatus==='planned'?item.purchaseIntent==='wish'?'wishlist':'purchase':'inventory')+'_'+action;
export function rolePermissions(role){return Object.fromEntries(CAPABILITIES.map(([key])=>[key,role==='owner'||role==='editor']))}
export function validPermissions(value){return value&&typeof value==='object'&&!Array.isArray(value)&&CAPABILITIES.every(([key])=>typeof value[key]==='boolean')}
export function assertStatePermissions(previous,next,permissions){
 const need=key=>{if(!permissions[key])throw Error('権限がありません：'+(CAPABILITIES.find(x=>x[0]===key)?.[2]||key));};
 for(const [section,prefix] of [['items','inventory'],['reservations','bookings']]){
  const before=(previous[section]||[]).filter(x=>!x._sharedSource),after=(next[section]||[]).filter(x=>!x._sharedSource),old=new Map(before.map(x=>[x.id,x])),upcoming=new Map(after.map(x=>[x.id,x]));let changed=false;
  for(const id of new Set([...old.keys(),...upcoming.keys()])){const a=old.get(id),b=upcoming.get(id);if(sameState(a,b))continue;changed=true;
   if(section==='items'&&b?.inventoryStatus==='planned'&&b.purchaseIntent!==undefined&&!['planned','wish'].includes(b.purchaseIntent))throw Error('購入状態を確認してください。');
   if(!a)need(section==='items'?itemPermission(b,'create'):prefix+'_create');else if(!b)need(prefix+'_delete');else if(section==='items'&&(a.inventoryStatus==='planned'||b.inventoryStatus==='planned')){need(itemPermission(a,'edit'));if(itemPermission(a,'edit')!==itemPermission(b,'edit'))need(itemPermission(b,'create'));}else if(section==='items'&&sameState({...a,remaining:0},{...b,remaining:0})){if(!permissions.inventory_edit)need('inventory_use');}else need(prefix+'_edit');
   if(section==='reservations'){for(const f of b?.attachments||[])if(!(a?.attachments||[]).some(x=>sameState(x,f)))need('files_upload');for(const f of a?.attachments||[])if(!(b?.attachments||[]).some(x=>sameState(x,f)))need('files_delete');}
  }
  if(!changed&&!sameState(before,after))need(prefix+'_edit');
 }
 if(!sameState(previous.customColorPresets,next.customColorPresets))need('inventory_edit');
 if(!sameState(previous.deleted,next.deleted)&&!permissions.inventory_create)need('inventory_delete');
}
export async function fetchPermissions(client,library,role,preloaded){
 const response=preloaded||await client.rpc('get_my_library_permissions',{lib:library});
 if(response.error){if(response.error.code==='PGRST202')return rolePermissions(role);throw response.error;}
 if(!validPermissions(response.data))throw Error('操作権限を確認できませんでした。再読み込みしてください。');return response.data;
}
export function createPermissionEditor({context,esc,changed}){
 return async function open(member){
  const c=context();if(!c.admin||c.active?.personal!==false||member.role==='owner')return;
  document.querySelector('#member-permissions-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='member-permissions-dialog';dialog.className='cloud-tools-dialog permission-dialog';dialog.setAttribute('aria-labelledby','memberPermissionsTitle');
  dialog.innerHTML='<div class="cloud-dialog-head"><div><small>MEMBER PERMISSIONS</small><h2 id="memberPermissionsTitle">操作権限</h2></div><button type="button" data-close-permissions aria-label="閉じる">×</button></div><form id="memberPermissionForm" class="cloud-dialog-body"><section class="permission-target"><label for="permission-member">対象メンバー</label><select id="permission-member" disabled></select><p id="permission-member-id" hidden></p><p>対象ライブラリ：<strong>'+esc(c.active.name)+'</strong>（共有用）</p></section><input type="checkbox" id="permission-admin" hidden disabled><p id="permission-admin-note" hidden>管理者の追加にはDB更新が必要です。library-administrators.sqlを適用してください。</p><label>権限<select id="permission-preset"><option value="admin" disabled>管理者</option><option value="viewer">閲覧のみ</option><option value="editor">すべて編集可</option><option value="custom">閲覧・部分編集者（個別設定）</option></select></label><details class="permission-help"><summary>権限の詳細・補足</summary><p>管理者はこの共有ライブラリのメンバー・在庫・予約を管理できます。完全削除はホストだけが行えます。</p><p>閲覧範囲は全メンバー共通です。商品編集は残量変更を含みます。予約への添付には予約編集とファイル追加の両方が必要です。</p></details><p id="permission-service-note" hidden>サービス管理者による機能制限があります。このライブラリでは、その範囲内で設定できます。</p><div id="permission-groups">'+[...new Set(CAPABILITIES.map(x=>x[1]))].map(group=>'<fieldset><legend>'+esc(group)+'</legend>'+CAPABILITIES.filter(x=>x[1]===group).map(([key,,label])=>'<label class="permission-choice"><input type="checkbox" data-permission="'+key+'">'+esc(label)+'</label>').join('')+'</fieldset>').join('')+'</div><p id="permission-result" role="status">読み込んでいます…</p><button type="button" id="permission-retry" hidden>権限設定を再読み込み</button></form><div class="permission-footer"><button type="submit" form="memberPermissionForm" id="permission-save" class="cloud-primary" disabled>権限を保存</button></div>';
  document.querySelector('#cloud-panel').append(dialog);dialog.showModal();let busy=false,ready=false,supportsAdmins=false,baseline=null,request=0,serviceLimits={};
  const administrator=dialog.querySelector('#permission-admin');const controls=[...dialog.querySelectorAll('[data-permission]')],preset=dialog.querySelector('#permission-preset'),result=dialog.querySelector('#permission-result'),save=dialog.querySelector('#permission-save');
  const target=dialog.querySelector('#permission-member'),members=[...new Map([...(c.members||[]),member].filter(x=>x.role!=='owner').map(x=>[x.user_id,x])).values()];
  const memberName=x=>x.display_name||'メンバー',memberId=x=>x.display_id?'@'+x.display_id:x.user_id;
  target.innerHTML=members.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(memberName(x)+' · '+memberId(x))+'</option>').join('');
  function identify(){target.value=member.user_id;dialog.querySelector('#permission-member-id').textContent='ユーザーID：'+memberId(member);save.textContent=memberName(member)+'さんの権限を保存';dialog.querySelector('#memberPermissionsTitle').textContent=memberName(member)+'さんの操作権限';}
  identify();
  for(const control of controls)control.disabled=true;preset.disabled=true;
  const signature=()=>JSON.stringify({admin:administrator.checked,preset:preset.value,permissions:controls.map(x=>x.checked)});
  const allowClose=()=>!ready||signature()===baseline||confirm('保存していない権限設定の変更を破棄しますか？');
  dialog.querySelector('[data-close-permissions]').onclick=()=>{if(!busy&&allowClose())dialog.close()};dialog.addEventListener('cancel',event=>{if(busy||!allowClose())event.preventDefault()});
  const apply=mode=>{if(administrator.checked)mode='admin';preset.value=mode;preset.disabled=false;dialog.querySelector('#permission-groups').hidden=mode!=='custom';for(const control of controls){if(mode!=='custom')control.checked=mode==='editor'||mode==='admin';if(serviceLimits[control.dataset.permission]===false)control.checked=false;control.disabled=mode!=='custom'||serviceLimits[control.dataset.permission]===false;control.closest('label').title=serviceLimits[control.dataset.permission]===false?'サービス管理者が利用を制限しています。':'';}};
  const edited=()=>{if(ready)result.textContent=signature()===baseline?'':'未保存の変更があります。「権限を保存」で反映します。'};
  preset.onchange=()=>{administrator.checked=preset.value==='admin';apply(preset.value);edited()};administrator.onchange=()=>{apply(preset.value);edited()};for(const input of controls)input.onchange=edited;
  const retry=dialog.querySelector('#permission-retry');
  async function load(){const ticket=++request,targetId=member.user_id;target.disabled=true;ready=false;baseline=null;retry.hidden=true;save.disabled=true;administrator.disabled=true;preset.disabled=true;for(const input of controls)input.disabled=true;result.textContent='読み込んでいます…';
  try{const response=await c.client.rpc('get_library_member_permissions',{lib:c.library});if(response.error)throw response.error;if(ticket!==request||targetId!==member.user_id||context().epoch!==c.epoch||context().library!==c.library||!dialog.open)return;const row=response.data.find(x=>x.user_id===targetId);if(!row)throw Error('このメンバーは参加していません。');serviceLimits=row.service_limits||{};dialog.querySelector('#permission-service-note').hidden=!Object.values(serviceLimits).includes(false);supportsAdmins=typeof row.is_library_admin==='boolean';administrator.checked=row.is_library_admin===true;administrator.disabled=!supportsAdmins;preset.querySelector('option[value="admin"]').disabled=!supportsAdmins;dialog.querySelector('#permission-admin-note').hidden=supportsAdmins;preset.value=row.role==='viewer'?'viewer':row.permissions?'custom':'editor';for(const input of controls)input.checked=row.permissions?.[input.dataset.permission]===true;apply(preset.value);save.disabled=false;ready=true;baseline=signature();result.textContent='';}
  catch(error){if(ticket!==request||!dialog.open)return;result.textContent=error.code==='PGRST202'?'個別権限の設定にはDB更新が必要です。member-permissions.sqlを適用してください。':'権限設定を読み込めませんでした。「権限設定を再読み込み」で再試行してください。';retry.hidden=false;}
  finally{if(ticket===request&&dialog.open)target.disabled=false;}
  }
  target.onchange=()=>{const next=members.find(x=>x.user_id===target.value);if(busy||!next||!allowClose()){target.value=member.user_id;return;}member=next;identify();dialog.querySelector('.cloud-dialog-body').scrollTop=0;void load();};
  retry.onclick=()=>{if(!busy&&allowClose())void load()};void load();
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!ready||busy)return;busy=true;save.disabled=true;for(const el of dialog.querySelectorAll('input,select,button'))el.disabled=true;result.textContent='保存しています…';try{if(administrator.checked&&!confirm('「'+memberName(member)+'（'+memberId(member)+'）」を「'+c.active.name+'」の管理者にします。参加者の権限変更と管理者追加も行えるようになります。よろしいですか？')){edited();return;}const response=await c.client.rpc(supportsAdmins?'set_library_member_access':'set_library_member_permissions',{lib:c.library,target_user:member.user_id,member_role:preset.value==='viewer'?'viewer':'editor',grants:preset.value==='custom'?Object.fromEntries(controls.map(x=>[x.dataset.permission,x.checked])):null,...supportsAdmins?{administrator:administrator.checked}:{}});if(response.error)throw response.error;if(context().epoch!==c.epoch||context().library!==c.library)return;baseline=signature();await changed();dialog.close();}catch(error){result.textContent=error.code==='PGRST202'?'管理者設定にはlibrary-administrators.sqlのDB更新が必要です。':classifyError(error).title+'。'+classifyError(error).action;}finally{busy=false;for(const el of dialog.querySelectorAll('button'))el.disabled=false;administrator.disabled=!supportsAdmins;target.disabled=false;apply(preset.value);}};
 };
}
