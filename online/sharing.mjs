import {classifyError} from './errors.mjs';
export function sharingIncludes(link,id,item){return item?.inventoryStatus==='planned'?!!link.included_ids?.includes(id):link.mode==='all'?!link.excluded_ids?.includes(id):!!link.included_ids?.includes(id)}
export function createFilamentSharing({context,bridge,esc,fail,refreshShared,prepare,authorizeTarget=async()=>true}){
 let links=[],sourceItems=[],sourceLinks=[],loadedLibrary=null,job=0;
 const missing=error=>error?.code==='PGRST202';
 const message=error=>missing(error)?'選択共有のデータベース更新が必要です。管理者に確認してください。':classifyError(error).category==='network'?'通信できませんでした。「共有設定を再読み込み」で再試行してください。共有設定は変更していません。':classifyError(error).action;
 const ctx=()=>context();
 function repaint(){bridge.repaint();}
 window.spoolSharingMarkup=item=>{
  if(item._sharedSource)return '';
  const names=loadedLibrary===ctx().library?links.filter(link=>link.active!==false&&sharingIncludes(link,item.id,item)).map(link=>link.shared_library_name):[];
  return names.length?'<span class="filament-sharing-label">共有中：'+esc(names.join('、'))+'</span>':loadedLibrary===ctx().library?'<span class="filament-sharing-label not-shared">'+(ctx().active?.personal===false?'共有ライブラリ内':'共有先への同期なし')+'</span>':'';
 };
 window.spoolStopSharing=async id=>{
  const c=ctx(),item=bridge.snapshot().items.find(x=>x.id===id),source=item?._sharedSource;if(!source?.canStop)return;
  if(!confirm('「'+item.name+'」を「'+c.active.name+'」の共有表示から外します。個人・共有元ライブラリの原本は削除しません。よろしいですか？'))return;
  try{const {error}=await c.client.rpc('stop_shared_filaments',{shared_lib:c.library,source_lib:source.id,item_ids:[source.itemId]});if(error)throw error;if(ctx().library===c.library&&ctx().epoch===c.epoch)await refreshShared(c.library)}catch(error){fail(Error(message(error)))}
 };
 window.spoolSelectionChanged=ids=>{const button=document.querySelector('#cloud-share-selected');if(button)button.disabled=!ids.length;};
 async function refresh(){
  const c=ctx(),ticket=++job;links=[];loadedLibrary=null;
  if(!c.session||!c.active||c.active.owner_id!==c.session.user.id){repaint();return;}
  const {data,error}=await c.client.rpc('get_filament_sharing',{source_lib:c.library});
  if(ticket!==job||ctx().epoch!==c.epoch||ctx().library!==c.library)return;
  if(error){if(!missing(error))fail(error);repaint();return;}
  loadedLibrary=c.library;links=Array.isArray(data)?data:[];repaint();
 }
 function mount(){
  const c=ctx();document.querySelector('#cloud-share-selected')?.remove();
  if(!c.active||!c.session)return;
  const owned=c.active.owner_id===c.session.user.id;
  if(owned){
   const button=document.createElement('button');button.id='cloud-share-selected';button.textContent='選択分を共有';button.disabled=!bridge.selected().length;button.onclick=()=>open({selected:bridge.selected()});document.querySelector('.bulk-action-buttons').append(button);
  }


 }
 async function open({selected=[],target=null,addOnly=false}={}){
  const c=ctx();if(!c.session)return;const epoch=c.epoch,owned=c.libraries.filter(x=>x.owner_id===c.session.user.id&&(!addOnly||x.personal===true)&&x.id!==target&&c.libraries.some(to=>to.personal===false&&to.id!==x.id)),targets=c.libraries.filter(x=>x.personal===false&&(!addOnly||x.id===target));
  document.querySelector('#filament-sharing-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='filament-sharing-dialog';dialog.className='cloud-tools-dialog filament-sharing-dialog';
  dialog.innerHTML='<div class="cloud-dialog-head"><h2>フィラメントの共有</h2><button type="button" data-sharing-close aria-label="閉じる">×</button></div><div class="cloud-dialog-body"><details class="sharing-description"><summary>共有される情報について</summary><p>選んだフィラメントの画像・タグ・メモ・残量を共有します。共有した購入予定は共有先でも編集できます。在庫の原本は共有元で編集します。この操作はメンバーへの招待とは異なり、共有元の予約・添付は共有しません。</p></details><div class="sharing-endpoints"><label>共有元<select id="sharing-source">'+owned.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name+(x.personal?'（個人用）':'（共有用）'))+'</option>').join('')+'</select></label><label>共有先<select id="sharing-target"></select></label></div><p id="sharing-route" class="sharing-route"></p><label class="sharing-future"><input type="checkbox" id="sharing-future">今後追加する在庫も共有（購入予定は選択したものだけ）</label><div class="sharing-list-actions"><button type="button" id="sharing-check-all">今あるすべてを選択</button><button type="button" id="sharing-check-none">すべて解除</button></div><label>フィラメントを検索<input type="search" id="sharing-search" placeholder="名前・色・タグ"></label><p id="sharing-count" role="status"></p><p id="sharing-changes" class="sharing-changes" role="status"></p><div id="sharing-items" class="sharing-items"></div><p id="sharing-result" role="status"></p><button type="button" id="sharing-retry" hidden>共有設定を再読み込み</button></div><div class="sharing-actions"><button type="button" id="sharing-stop-all" class="danger">この共有元からの共有を停止</button><button type="button" id="sharing-save" class="cloud-primary">共有設定を保存</button></div>';
  document.querySelector('#cloud-panel').append(dialog);dialog.showModal();
  dialog.addEventListener('cancel',event=>{if(busy||!allowDiscard())event.preventDefault()});dialog.querySelector('[data-sharing-close]').onclick=()=>{if(!busy&&allowDiscard())dialog.close()};
  const $=s=>dialog.querySelector(s),source=$('#sharing-source'),destination=$('#sharing-target'),result=$('#sharing-result');let checked=new Set(),request=0,busy=false,baseline=null,loaded=false,editable=false,settingsKnown=false;
  if(addOnly){dialog.classList.add('sharing-add-dialog');dialog.querySelector('.cloud-dialog-head h2').textContent='個人ライブラリから追加';$('#sharing-future').closest('label').hidden=true;$('#sharing-stop-all').hidden=true;$('#sharing-check-all').textContent='未共有をすべて選択';$('#sharing-check-none').textContent='追加分を解除';$('#sharing-save').textContent='選択したフィラメントを追加';destination.disabled=true;}
  const existing=()=>{const link=sourceLinks.find(x=>x.shared_library_id===destination.value);return new Set(sourceItems.filter(x=>link&&sharingIncludes(link,x.id,x)).map(x=>x.id))};
  const available=()=>{if(!addOnly||!settingsKnown)return sourceItems;const shared=existing();return sourceItems.filter(x=>!shared.has(x.id))};
  function signature(){return JSON.stringify({ids:[...checked].sort(),automatic:$('#sharing-future').checked})}
  function allowDiscard(){return !loaded||signature()===baseline||confirm('保存していない共有設定の変更を破棄しますか？')}
  function changes(){const link=sourceLinks.find(x=>x.shared_library_id===destination.value),before=new Set(sourceItems.filter(x=>link&&sharingIncludes(link,x.id,x)).map(x=>x.id)),added=[...checked].filter(id=>!before.has(id)).length,removed=[...before].filter(id=>!checked.has(id)).length;if(addOnly&&settingsKnown){$('#sharing-changes').textContent='追加 '+added+' 件（共有済み '+before.size+' 件は維持します）';return;}$('#sharing-changes').textContent='保存すると：追加 '+added+' 件 ／ 共有停止 '+removed+' 件'+($('#sharing-future').checked?' ／ 今後の追加分も共有':' ／ 現在選択した分だけ共有');}
  source.value=owned.some(x=>x.id===c.library)?c.library:owned.find(x=>x.personal)?.id||owned[0]?.id||'';
  function route(){const a=owned.find(x=>x.id===source.value),b=targets.find(x=>x.id===destination.value);$('#sharing-route').textContent=(a?.name||'共有元なし')+' → '+(b?.name||'共有先なし');}
  function list(){const sharedIds=existing();const q=$('#sharing-search').value.trim().toLowerCase();$('#sharing-items').innerHTML=available().filter(x=>[x.name,x.brand,x.colorName,...x.tags||[]].join(' ').toLowerCase().includes(q)).map(item=>'<label class="sharing-item"><input type="checkbox" data-share-id="'+esc(item.id)+'" '+(!editable?'disabled ':'')+(checked.has(item.id)?'checked':'')+'><i style="background:'+esc(/^#[0-9a-f]{6}$/i.test(item.color)?item.color:'#DDE5DF')+'"></i><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.colorName+' / '+item.brand)+(item.inventoryStatus==='planned'?(item.purchaseIntent==='wish'?' · 購入希望':' · 購入予定'):'')+'</small></span></label>').join('')||'<p>'+(addOnly&&settingsKnown?'追加できる未共有のフィラメントがありません。':'対象のフィラメントがありません。')+'</p>';$('#sharing-count').textContent=addOnly?(settingsKnown?'追加予定 '+[...checked].filter(id=>!sharedIds.has(id)).length+' / 未共有 '+available().length+' 件（共有済みは非表示）':'登録 '+sourceItems.length+' 件（共有状況は未確認）'):checked.size+' / '+sourceItems.length+' 件を共有';changes();for(const input of dialog.querySelectorAll('[data-share-id]'))input.onchange=()=>{if(input.checked)checked.add(input.dataset.shareId);else checked.delete(input.dataset.shareId);list()};if(addOnly)$('#sharing-save').disabled=!editable||!settingsKnown||[...checked].every(id=>sharedIds.has(id));}
  function chooseTarget(){const link=sourceLinks.find(x=>x.shared_library_id===destination.value);checked=new Set(sourceItems.filter(x=>link&&sharingIncludes(link,x.id,x)).map(x=>x.id));$('#sharing-future').checked=link?.mode==='all';baseline=signature();for(const id of selected)if(source.value===c.library&&sourceItems.some(x=>x.id===id))checked.add(id);route();list();}
  function ready(value){editable=value;for(const input of dialog.querySelectorAll('[data-share-id]'))input.disabled=!value;for(const id of ['#sharing-check-all','#sharing-check-none','#sharing-search','#sharing-future','#sharing-save','#sharing-stop-all'])$(id).disabled=!value;$('#sharing-stop-all').disabled=!loaded||!sourceLinks.some(x=>x.shared_library_id===destination.value);if(addOnly){const old=existing();$('#sharing-save').disabled=!value||!settingsKnown||[...checked].every(id=>old.has(id));}}
  async function load(){loaded=false;settingsKnown=false;$('#sharing-retry').hidden=true;const ticket=++request;sourceItems=[];sourceLinks=[];checked.clear();list();ready(false);result.textContent='共有設定を読み込んでいます…';$('#sharing-save').disabled=$('#sharing-stop-all').disabled=true;destination.innerHTML=targets.filter(x=>x.id!==source.value).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');if(target&&[...destination.options].some(x=>x.value===target))destination.value=target;
   if(!source.value||!destination.value){result.textContent='所有する共有元と、参加中の共有ライブラリが必要です。';sourceItems=[];sourceLinks=[];route();list();return;}
   try{await prepare();if(ctx().epoch!==epoch||!dialog.open)return;const [settings,inventory]=await Promise.all([c.client.rpc('get_filament_sharing',{source_lib:source.value}),source.value===c.library?Promise.resolve({data:{state:bridge.snapshot()}}):c.client.from('library_state').select('state').eq('library_id',source.value).single()]);if(ticket!==request||ctx().epoch!==epoch||!dialog.open)return;if(inventory.error)throw inventory.error;sourceItems=(inventory.data.state.items||[]).filter(x=>!x._sharedSource);sourceLinks=Array.isArray(settings.data)?settings.data:[];if(settings.error){chooseTarget();$('#sharing-changes').textContent='既存の共有設定を取得できていません。保存はできません。';throw settings.error;}settingsKnown=true;chooseTarget();previousTarget=destination.value;loaded=true;const allowed=await authorizeTarget(destination.value);if(ticket!==request||ctx().epoch!==epoch||!dialog.open)return;ready(allowed);if(!allowed){result.textContent='この共有先への共有設定を変更する権限がありません。所有者に確認してください。';return;}result.textContent='画面下のボタンで選択内容を反映します。';loaded=true;ready(true);}catch(error){if(ticket===request){result.textContent=message(error);$('#sharing-retry').hidden=false;}}
  }
  let previousSource=source.value,previousTarget='';source.onchange=()=>{if(!allowDiscard()){source.value=previousSource;return}previousSource=source.value;selected=[];load()};destination.onchange=async()=>{if(!allowDiscard()){destination.value=previousTarget;return}selected=[];chooseTarget();previousTarget=destination.value;const target=destination.value,ticket=++request;ready(false);try{const permitted=await authorizeTarget(target);if(ticket!==request||destination.value!==target||ctx().epoch!==epoch||!dialog.open)return;ready(permitted);result.textContent=permitted?'選択内容は保存するまで反映されません。':'この共有先への共有変更権限がありません。';}catch(error){result.textContent=message(error);$('#sharing-retry').hidden=false;}};$('#sharing-search').oninput=list;$('#sharing-check-all').onclick=()=>{checked=new Set(sourceItems.map(x=>x.id));list()};$('#sharing-check-none').onclick=()=>{if(addOnly)checked=existing();else{checked.clear();$('#sharing-future').checked=false;}list()};
  $('#sharing-future').onchange=()=>{if($('#sharing-future').checked)checked=new Set(sourceItems.filter(x=>x.inventoryStatus!=='planned'||checked.has(x.id)).map(x=>x.id));list()};
  async function save(stop=false){if(busy||!loaded||(!stop&&!editable)||(addOnly&&stop))return;if(addOnly)for(const id of existing())checked.add(id);const selectedSource=source.value,selectedTarget=destination.value,automatic=addOnly?sourceLinks.some(x=>x.shared_library_id===destination.value&&x.mode==='all'):$('#sharing-future').checked;if(!selectedSource||!selectedTarget)return;
   const addedCount=addOnly?[...checked].filter(id=>!existing().has(id)).length:checked.size;
   if(!confirm(addOnly?'「'+c.active.name+'」に未共有の '+addedCount+' 件を追加します。既存の共有と原本は維持します。よろしいですか？':stop?$('#sharing-route').textContent+' の共有を停止します。原本と他の共有先は残ります。':$('#sharing-route').textContent+' に '+checked.size+'件を共有します。'+(automatic?'今後の追加分も共有します。':'今後の追加分は自動共有しません。')+'選択から外したフィラメントの共有は停止します。'))return;
   busy=true;for(const control of dialog.querySelectorAll('button,input,select'))control.disabled=true;result.textContent='保存しています…';
   try{const response=await c.client.rpc('set_filament_sharing',{shared_lib:selectedTarget,source_lib:selectedSource,sharing_mode:stop?'none':automatic?'all':'selected',item_ids:automatic?sourceItems.filter(x=>x.inventoryStatus==='planned'&&checked.has(x.id)).map(x=>x.id):[...checked],excluded_item_ids:automatic?sourceItems.filter(x=>x.inventoryStatus!=='planned'&&!checked.has(x.id)).map(x=>x.id):[]});if(response.error)throw response.error;if(ctx().epoch!==epoch)return;await refresh();if(ctx().library===selectedTarget)await refreshShared(selectedTarget);dialog.close();bridge.notify?.(stop?'この共有先への表示を停止しました。原本は残っています。':addOnly?addedCount+' 件を共有先に追加しました。':checked.size+' 件の共有設定を保存しました。');}
   catch(error){result.textContent=message(error)}finally{busy=false;for(const control of dialog.querySelectorAll('button,input,select'))control.disabled=false;ready(editable);destination.disabled=addOnly;}
  }
  $('#sharing-retry').onclick=()=>load();$('#sharing-save').onclick=()=>save();$('#sharing-stop-all').onclick=()=>save(true);load();
 }
 return {mount,refresh,open,clear(){job++;links=[];loadedLibrary=null;document.querySelector('#cloud-share-selected')?.remove();}};
}
