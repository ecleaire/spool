let editorEntryMode='start';
const tagEditors=[];
function refreshTagEditors(){for(const editor of tagEditors)editor.render()}
for(const group of $$('[data-tag-suggestions]')){
 const form=$('#'+group.dataset.tagSuggestions),field=form.elements.namedItem('tags');
 if(!field?.after)continue;
 const host=document.createElement('span');host.className='tag-editor';
 host.innerHTML='<span class="selected-tags" role="group" aria-label="追加済みのタグ"></span><span class="tag-entry-row"><input type="text" class="tag-entry-input" maxlength="640" autocomplete="off" placeholder="タグを入力" aria-label="新しいタグ"><button type="button" class="tag-entry-add">追加</button></span><span class="tag-entry-error" role="alert"></span>';
 field.type='hidden';field.after(host);
 const input=host.querySelector('input'),selected=host.querySelector('.selected-tags'),error=host.querySelector('.tag-entry-error');
 let rendered;
 const render=()=>{if(rendered===field.value)return;rendered=field.value;selected.innerHTML=sortTags(parseTags(field.value)).map(tag=>'<button type="button" class="selected-tag" data-remove-tag="'+esc(tag)+'" aria-label="'+esc(tag)+'を外す">#'+esc(tag)+' <span aria-hidden="true">×</span></button>').join('');for(const button of selected.querySelectorAll('button'))button.onclick=()=>{field.value=parseTags(field.value).filter(tag=>tag!==button.dataset.removeTag).join(', ');field.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}};
 const commit=()=>{if(!input.value.trim())return true;try{const tags=[...new Set([...parseTags(field.value),...parseTags(input.value)])];if(!validTags(tags))throw Error('タグは20個まで、1個30文字以内で入力してください。');field.value=tags.join(', ');input.value='';error.textContent='';field.dispatchEvent(new Event('input',{bubbles:true}));return true}catch(e){error.textContent=e.message;return false}};
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();commit()}});
 input.addEventListener('input',()=>{error.textContent=''});
 input.addEventListener('blur',event=>{if(!group.contains(event.relatedTarget))commit()});
 group.addEventListener('pointerdown',event=>{if(document.activeElement===input&&event.target.closest('button'))event.preventDefault()});
 host.querySelector('.tag-entry-add').onclick=()=>{commit();input.focus()};
 form.addEventListener('submit',event=>{if(!commit()){event.preventDefault();event.stopImmediatePropagation();input.focus()}},true);
 form.addEventListener('reset',()=>{input.value='';error.textContent='';queueMicrotask(render)});
 tagEditors.push({render,input,field});render();
}
const DEFAULT_TAGS=['よく使う','シルク','マット','ノーマル','半透明','多色','青系','赤系','緑系','黄系','オレンジ系','紫系','ピンク系','茶系','ベージュ系','白系','黒系','グレー系'];
function tagCandidates(){return sortTags([...DEFAULT_TAGS,...items.flatMap(item=>item.tags||[]),...reservations.flatMap(bookingTags)]);}
function refreshTagSuggestions(){refreshTagEditors();const draft=$('#form').elements;$('#automaticFilamentTags').innerHTML=tagsMarkup(automaticFilamentTags(Object.fromEntries(['name','variant','material','colorName','color'].map(key=>[key,draft.namedItem(key).value]))));const locations=[...new Set(items.map(item=>String(item.location||'').trim()).filter(Boolean))];$('#locationSuggestions').innerHTML=locations.map(value=>'<option value="'+esc(value)+'"></option>').join('');for(const group of $$('[data-tag-suggestions]')){const candidates=group.dataset.tagSuggestions==='bookingForm'?[...new Set(['A2','A3','EX','急ぎ','ゆっくり',...tagCandidates()])]:tagCandidates().filter(tag=>!['急ぎ','ゆっくり'].includes(tag));const field=$('#'+group.dataset.tagSuggestions).elements.namedItem('tags'),tags=String(field.value||'').split(/[,、\n]/).map(x=>x.trim().replace(/^#/,''));const key=JSON.stringify(candidates);if(group.dataset.candidates!==key){group.dataset.candidates=key;group.innerHTML=candidates.map(tag=>'<button type="button" data-suggested-tag="'+esc(tag)+'" aria-pressed="false">#'+esc(tag)+'</button>').join('');for(const button of group.querySelectorAll('button'))button.onclick=()=>{try{let selected=parseTags(field.value);const tag=button.dataset.suggestedTag;selected=selected.includes(tag)?selected.filter(x=>x!==tag):[...selected,tag];if(!validTags(selected))throw Error('タグは20個までです。');field.value=selected.join(', ');const editor=tagEditors.find(x=>x.field===field);if(editor?.input.value.trim().replace(/^#/,'')===tag)editor.input.value='';field.dispatchEvent?.(new Event('input',{bubbles:true}));refreshTagSuggestions()}catch(error){toast(error.message)}}}for(const button of group.querySelectorAll('button'))button.setAttribute('aria-pressed',String(tags.includes(button.dataset.suggestedTag)))}}
for(const group of $$('[data-tag-suggestions]'))$('#'+group.dataset.tagSuggestions).addEventListener('input',refreshTagSuggestions);
refreshTagSuggestions();
function resetEditorScroll(){const reset=()=>{for(const selector of ['#editor','#form','#editor .editor-layout','#colorPresets','#elegooProducts']){const node=$(selector);if(node){node.scrollTop=0;node.scrollLeft=0;}}};reset();if(typeof requestAnimationFrame==='function')requestAnimationFrame(reset);}
function resetFormValidation(form){for(const node of form.querySelectorAll?.('.field-error')||[])node.remove();for(const field of form.querySelectorAll?.('input,select,textarea')||[]){field.removeAttribute('aria-invalid');field.classList.remove('has-field-error');const ids=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&!id.startsWith('error-'));if(ids.length)field.setAttribute('aria-describedby',ids.join(' '));else field.removeAttribute('aria-describedby');}}
// Shared input ergonomics. Data remains in the existing item/booking schemas.
function updateDraftSummary(){window.spoolRefreshPermissions?.();refreshTagSuggestions();organizeAutofillDetails();const planned=['planned','wish'].includes($('#form').elements.namedItem('inventoryStatus').value);$('#purchasePlanHint').hidden=!planned;$('#remainingLabel').textContent=planned?'購入後の予定残量 (g)':'残量 (g)';const fields=$('#form').elements,name=fields.namedItem('name').value.trim(),brand=fields.namedItem('brand').value.trim(),variant=fields.namedItem('variant').value.trim(),color=normalizeHex(fields.namedItem('color').value),remaining=Number(fields.namedItem('remaining').value),capacity=Number(fields.namedItem('capacity').value);const selectedProduct=PRODUCT_LIBRARY.find(p=>p.id===$('#editorProduct').value);if(selectedProduct&&!window.spoolCatalogApplying&&['name','brand','material','variant'].some(key=>String(selectedProduct[key])!==fields.namedItem(key).value))$('#editorProduct').value='';organizeAutofillDetails();$('#productInfoSummary').textContent=[brand,name].filter(Boolean).join(' / ')||'手入力';$('#colorInfoSummary').textContent=fields.namedItem('colorName').value.trim()||'カラー名を入力してください';$('#colorInfoHex').textContent=color||'';$('#colorInfoSwatch').className=swatchClass({name,variant,colorName:fields.namedItem('colorName').value});$('#colorInfoSwatch').style.background=color||'#dfe7e3';$('#colorInfoSwatch').style.setProperty?.('--swatch-glass',(color||'#dfe7e3')+'99');$('#materialDetails').hidden=fields.namedItem('material').value!=='PLA';$('#draftName').textContent=name||'新しいフィラメント';$('#draftBrand').textContent=[brand,variant||fields.namedItem('material').value].filter(Boolean).join(' / ')||'商品情報を入力してください';$('#draftColor').textContent=fields.namedItem('colorName').value.trim()||color||'カラー未設定';$('#draftSwatch').className=swatchClass({name,variant,colorName:fields.namedItem('colorName').value});$('#draftSwatch').style.background=color||'#dfe7e3';$('#draftSwatch').style.setProperty?.('--swatch-glass',(color||'#dfe7e3')+'99');$('#draftWeight').innerHTML=(Number.isFinite(remaining)?remaining.toLocaleString():'—')+' <small>/ '+(capacity>0?capacity.toLocaleString():'—')+' g</small>';$('#draftWeightBar').style.width=(capacity>0?Math.min(100,Math.max(0,remaining/capacity*100)):0)+'%';fields.namedItem('remaining').max=capacity>0?String(capacity):'100000';const copies=editId?1:Math.max(1,Number(fields.namedItem('copies').value)||1),validWeight=Number.isInteger(remaining)&&Number.isInteger(capacity)&&capacity>0&&remaining>=0&&remaining<=capacity;$('#filamentSaveSummary').textContent=(planned?(editId?(fields.namedItem('inventoryStatus').value==='wish'?'購入希望を更新':'購入予定を更新'):copies+'本を'+(fields.namedItem('inventoryStatus').value==='wish'?'購入希望':'購入予定')+'に追加'):(editId?'このスプールを更新':copies+'本を追加'))+' ／ '+(validWeight?(planned?'購入後の予定残量 ':'残量 ')+(remaining*copies).toLocaleString()+' g'+(copies>1?'（'+remaining.toLocaleString()+' g × '+copies+'本）':''):'残量と容量を確認してください');$('#filamentStepProduct').classList.toggle('is-complete',!!name&&!!brand);$('#filamentStepColor').classList.toggle('is-complete',!!color&&!!fields.namedItem('colorName').value.trim());$('#filamentStepStock').classList.toggle('is-complete',validWeight);$$('[data-spool-capacity]').forEach(button=>{const active=Number(button.dataset.spoolCapacity)===capacity;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active))})}
function applySpoolCapacity(value){const fields=$('#form').elements,previous=Number(fields.namedItem('capacity').value),remaining=Number(fields.namedItem('remaining').value);fields.namedItem('capacity').value=String(value);if(remaining===previous)fields.namedItem('remaining').value=String(value);updateDraftSummary()}
$$('[data-spool-capacity]').forEach(button=>button.onclick=()=>applySpoolCapacity(Number(button.dataset.spoolCapacity)));
$('#fillRemaining').onclick=()=>{const fields=$('#form').elements;fields.namedItem('remaining').value=fields.namedItem('capacity').value;updateDraftSummary()};
$$('[data-copy-step]').forEach(button=>button.onclick=()=>{const field=$('#form').elements.namedItem('copies');field.value=String(Math.min(100,Math.max(1,(Number(field.value)||1)+Number(button.dataset.copyStep))));updateDraftSummary()});
$$('[data-usage-amount]').forEach(button=>button.onclick=()=>{const field=$('#used'),value=Number(button.dataset.usageAmount),max=Number(field.max);field.value=String(max>0?Math.min(value,max):value);field.focus?.()});
$$('[data-form-jump]').forEach(button=>button.onclick=()=>{const target=$('#'+button.dataset.formJump);target.scrollIntoView({behavior:'smooth',block:'start'});const input=target.parentElement?.nextElementSibling?.querySelector('input:not([type=hidden]),select');input?.focus({preventScroll:true})});
function friendlyFieldError(field){const v=field.validity;if(!v)return '';if(v.valueMissing)return 'この項目を入力してください。';if(v.typeMismatch)return field.type==='url'?'https:// から始まるURLを入力してください。':'入力形式を確認してください。';if(v.rangeOverflow)return field.name==='remaining'?'残量は初期重量以下にしてください。':'上限は '+field.max+' です。';if(v.rangeUnderflow)return '最小値は '+field.min+' です。';if(v.stepMismatch)return '整数で入力してください。';return v.valid?'':field.validationMessage||'入力内容を確認してください。'}
function showFieldError(field){if(field.type==='hidden'||field.disabled)return;const label=field.closest?.('label');if(!label)return;let message=label.querySelector('.field-error');const text=friendlyFieldError(field);if(text){let parent=field.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement}}if(!message&&text){message=document.createElement('small');message.className='field-error';message.id='error-'+(field.id||field.name||crypto.randomUUID());message.setAttribute('role','status');field.setAttribute('aria-describedby',[(field.getAttribute('aria-describedby')||''),message.id].filter(Boolean).join(' '));label.append(message)}if(message)message.textContent=text;field.setAttribute('aria-invalid',String(!!text));field.classList.toggle('has-field-error',!!text)}
for(const selector of ['#form','#bookingForm','#usageForm','#bulkForm']){const form=$(selector);form.addEventListener('invalid',event=>{showFieldError(event.target);event.target.focus?.()},true);form.addEventListener('input',event=>{if(event.target.getAttribute?.('aria-invalid')==='true')showFieldError(event.target);if(selector==='#form'&&event.target.id!=='editorProduct')updateDraftSummary()});form.addEventListener('change',()=>{if(selector==='#form')updateDraftSummary()});form.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing||!event.target.matches?.('input:not([type=file]):not([type=checkbox]):not([type=color])'))return;const inputs=[...form.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=color]),select,textarea,button[type=submit]')].filter(field=>!field.disabled&&field.getClientRects().length);const next=inputs[inputs.indexOf(event.target)+1];if(next){event.preventDefault();next.focus()}})}
const inputOriginalPreview=updatePreview;updatePreview=function(){inputOriginalPreview();updateDraftSummary()};
const inputOriginalEditor=openEditor;openEditor=function(id){setEditorMode(id?'manual':'start');$('#presetSearch').value='';inputOriginalEditor(id);$('#productInfoDetails').open=true;$('#colorInfoDetails').open=true;refreshStockTemplates();const form=$('#form');resetFormValidation(form);for(const id of ['#filamentExtras','#materialDetails','#stockDetails','#presetDetails'])$(id).open=false;$('#filamentTagDetails').open=true;const f=form.elements,matched=PRODUCT_LIBRARY.find(p=>p.brand===f.namedItem('brand').value&&p.name===f.namedItem('name').value&&p.variant===f.namedItem('variant').value);$('#editorProduct').value=matched?.id||'';$('#productAutofillStatus').textContent=id?'保存済みの内容を表示しています。商品を選び直すと商品情報を再入力します。':'商品を選ぶと情報を自動入力します。すべての項目を変更できます。';updateDraftSummary();resetEditorScroll();window.spoolRefreshPermissions?.()};
const inputOriginalBooking=openBooking;openBooking=function(id){inputOriginalBooking(id);$('#bookingUploadHelp').open=false;$('#bookingExtraDetails').open=false;$('#bookingTagDetails').open=false;$('#bookingFileDetails').open=false;$('#bookingForm').elements.namedItem('printDuration').setCustomValidity('');resetFormValidation($('#bookingForm'));refreshTagSuggestions();window.spoolRefreshPermissions?.()};

function formatPrintDuration(minutes){return Math.floor(minutes/60)+':'+String(minutes%60).padStart(2,'0')}
function setPrintDuration(minutes){const field=$('#bookingForm').elements.namedItem('printDuration');field.value=formatPrintDuration(Math.min(60000,Math.max(1,minutes)));field.setCustomValidity('');$('#bookingDurationHint').textContent='合計 '+durationLabel(parsePrintDuration(field.value));showFieldError(field)}
$$('[data-print-duration]').forEach(button=>button.onclick=()=>setPrintDuration(Number(button.dataset.printDuration)));
$('#durationMinus').onclick=()=>setPrintDuration((parsePrintDuration($('#bookingForm').elements.namedItem('printDuration').value)||60)-15);$('#durationPlus').onclick=()=>setPrintDuration((parsePrintDuration($('#bookingForm').elements.namedItem('printDuration').value)||60)+15);
const durationInput=$('#bookingForm').elements.namedItem('printDuration');durationInput.addEventListener('input',()=>{durationInput.setCustomValidity('');const minutes=parsePrintDuration(durationInput.value);$('#bookingDurationHint').textContent=minutes?'合計 '+durationLabel(minutes):'例：1:30、90分、1時間30分。候補からも選べます。'});durationInput.addEventListener('focusout',()=>{const minutes=parsePrintDuration(durationInput.value);if(minutes){durationInput.value=formatPrintDuration(minutes);durationInput.setCustomValidity('')}else if(durationInput.value.trim())durationInput.setCustomValidity('例：1:30、90分、1時間30分（1分以上1000時間以内）')});

$('#manualFilamentEntry').onclick=()=>{$('#editorProduct').value='';setEditorMode('manual');organizeAutofillDetails();$('#productInfoDetails').open=true;$('#colorInfoDetails').open=true;$('#productAutofillStatus').textContent='商品名・ブランド・カラーを入力してください。入力済みの内容も変更できます。';$('#form').elements.namedItem('name').focus?.();};
$('#imageDrop').addEventListener('keydown',event=>{if(event.target===$('#imageDrop')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();$('#photo').click();}});

// The foreground search panel uses the same fields and result sets as the list.
let foregroundSearchState={mode:'inventory',tab:'results',fields:null};
function activeSearchInput(){return $(foregroundSearchState.mode==='bookings'?'#bookingSearch':'#search')}
function refreshSearchPanel(){
 if(!$('#searchDialog').open)return;
 const bookings=foregroundSearchState.mode==='bookings',records=bookings?searchBookingResults:searchItemResults;
 const filters=bookings?['#bookingTagFilter']:['#brand','#material','#variantFilter','#locationFilter','#tagFilter'];
 const count=filters.filter(id=>$(id).value).length;
 $('#foregroundResultCount').textContent=String(records.length);$('#foregroundFilterCount').textContent=count?String(count):'';
 $('#clearSearchFilters').hidden=!count;$('#clearSearchQuery').hidden=!activeSearchInput().value;
 const scope=bookings?($('#bookingStatusFilter').value||'すべての予約'):({all:'すべてのフィラメント',low:'残量が少ない',empty:'使い切り',planned:'購入予定'}[tab]||'フィラメント');
 $('#searchResultHint').textContent=scope+' · '+records.length+'件'+(records.length>12?'（先頭12件を表示）':'');
 $('#foregroundResults').classList.toggle('filament-search-cards',!bookings);
 $('#foregroundResults').innerHTML=records.length?records.slice(0,12).map((item,index)=>bookings?
  '<button type="button" class="search-result" data-search-result="'+index+'"><i class="search-booking-color '+(item.colorPreference==='none'?'swatch-no-preference':swatchClass({translucent:item.colorTranslucent,name:item.desiredColor}))+'" style="'+swatchStyle(item,item.color)+'"></i><span class="search-result-copy"><strong>'+esc(item.title)+'</strong><small>'+esc(item.desiredColor)+' · '+esc(bookingStatus(item))+'</small>'+tagsMarkup((item.tags||[]).slice(0,3))+'</span><span class="search-result-meta">'+esc(item.deadline?displayDate(item.deadline):'期限未定')+'</span><span aria-hidden="true">↗</span></button>':
  '<button type="button" class="search-result" data-search-result="'+index+'"><img src="'+esc(filamentProductImage(item))+'" alt=""><span class="search-result-copy"><strong>'+esc(item.name)+'</strong><small>'+esc(item.brand)+' · '+esc(item.colorName)+'</small>'+tagsMarkup(filamentTags(item).slice(0,4))+'</span><span class="search-result-meta">'+(isPlanned(item)?purchaseLabel(item):item.remaining.toLocaleString()+' g')+'</span><span aria-hidden="true">↗</span></button>').join(''):'<div class="search-panel-empty">一致する項目がありません。<small>キーワードや絞り込み条件を変更してください。</small></div>';
 $('#foregroundResults').querySelectorAll('[data-search-result]').forEach(button=>button.onclick=()=>{
  const item=records[Number(button.dataset.searchResult)];closeSearchPanel();
  if(!bookings){openFilamentDetails(item.id);return;}
  const row=$$('[data-booking-id]').find(node=>node.dataset.bookingId===item.id&&node.getBoundingClientRect().width>0);
  if(row){row.scrollIntoView({block:'center'});row.classList.add('search-result-highlight');setTimeout(()=>row.classList.remove('search-result-highlight'),2200)}
 });
}
function setSearchPanelTab(value){foregroundSearchState.tab=value;for(const [id,tabValue]of [['#searchQueryTab','results'],['#searchFiltersTab','filters']]){const active=value===tabValue;$(id).setAttribute('aria-selected',String(active));$(id).tabIndex=active?0:-1}$('#searchResultsPanel').hidden=value!=='results';$('#searchFiltersPanel').hidden=value!=='filters'}
function restoreSearchFields(){const saved=foregroundSearchState.fields;if(!saved)return;saved.parent.insertBefore(saved.node,saved.next?.parentNode===saved.parent?saved.next:null);foregroundSearchState.fields=null}
function closeSearchPanel(){$('#searchDialog').close();restoreSearchFields()}
function openSearchPanel(mode){
 if($('#searchDialog').open)return;
 foregroundSearchState.mode=mode;const bookings=mode==='bookings',fields=$(bookings?'#bookingFilters .filter-fields':'#inventoryFilters .filter-fields');
 foregroundSearchState.fields={node:fields,parent:fields.parentNode,next:fields.nextSibling};$('#foregroundFilters').append(fields);
 $('#searchPanelScope').textContent=bookings?'印刷予約':'フィラメント';$('#foregroundSearch').value=activeSearchInput().value;
 $('#foregroundSearch').placeholder=bookings?'作品名・希望色・タグで検索':'名前・カラー・タグで検索';setSearchPanelTab('results');$('#searchDialog').showModal();refreshSearchPanel();$('#foregroundSearch').focus();$('#foregroundSearch').select();
}
function applyForegroundQuery(){activeSearchInput().value=$('#foregroundSearch').value;foregroundSearchState.mode==='bookings'?renderBookings():render()}
$('#foregroundSearch').oninput=applyForegroundQuery;
$('#clearSearchQuery').onclick=()=>{$('#foregroundSearch').value='';applyForegroundQuery();$('#foregroundSearch').focus()};
$('#clearSearchFilters').onclick=()=>{for(const id of foregroundSearchState.mode==='bookings'?['#bookingTagFilter']:['#brand','#material','#variantFilter','#locationFilter','#tagFilter'])$(id).value='';foregroundSearchState.mode==='bookings'?renderBookings():render()};
$('#searchQueryTab').onclick=()=>setSearchPanelTab('results');$('#searchFiltersTab').onclick=()=>setSearchPanelTab('filters');
for(const [id,other,value]of [['#searchQueryTab','#searchFiltersTab','filters'],['#searchFiltersTab','#searchQueryTab','results']])$(id).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setSearchPanelTab(value);$(other).focus()}});
$('#closeSearchPanel').onclick=closeSearchPanel;$('#searchDialog').addEventListener('close',()=>{if(!$('#searchDialog').open)restoreSearchFields()});
$('#searchDialog').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSearchPanel()}});
$('#applySearchPanel').onclick=()=>{const target=foregroundSearchState.mode==='bookings'?'#bookingView':'.inventory';closeSearchPanel();$(target).scrollIntoView({block:'start'})};
for(const [id,mode]of [['#search','inventory'],['#bookingSearch','bookings']]){$(id).addEventListener('click',()=>openSearchPanel(mode));$(id).addEventListener('keydown',event=>{if(event.key==='Enter'||event.key==='ArrowDown'){event.preventDefault();openSearchPanel(mode)}})}
window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!document.body.classList.contains('cloud-locked')&&!document.querySelector('dialog[open]')){event.preventDefault();openSearchPanel(bookingsShowing?'bookings':'inventory')}});

// Display preferences are separate from stock, backups and authentication tokens.
const DISPLAY_KEY='spool-display-v1';
let displayAccount=document.body.classList.contains('cloud-locked')?null:'offline',restoringDisplay=false;
function displayStorageKey(){return displayAccount?DISPLAY_KEY+':'+displayAccount:null}
function saveDisplayPreferences(){
 if(restoringDisplay||!displayStorageKey())return;
 try{localStorage.setItem(displayStorageKey(),JSON.stringify({version:1,view,sort:$('#sort').value,bookingSort:$('#bookingSort').value,inventoryFilters:$('#inventoryFilters').open,bookingFilters:$('#bookingFilters').open}))}catch{}
}
function restoreDisplayPreferences(account){
 displayAccount=account;restoringDisplay=true;
 let saved={};try{const value=JSON.parse(localStorage.getItem(displayStorageKey())||'null');if(value?.version===1)saved=value}catch{}
 for(const [id,key,fallback] of [['#sort','sort','manual'],['#bookingSort','bookingSort','deadline']]){
  const field=$(id),allowed=[...(field.options||[])].map(option=>option.value);field.value=allowed.includes(saved[key])?saved[key]:fallback;
 }
 for(const id of ['inventoryFilters','bookingFilters'])$('#'+id).open=saved[id]===true;
 changeView(['list','split','grid','simple'].includes(saved.view)?saved.view:'simple');renderBookings();restoringDisplay=false;
}
for(const id of ['#listView','#splitView','#gridView','#simpleView','#toggleReorder'])$(id).addEventListener('click',saveDisplayPreferences);
for(const id of ['#sort','#bookingSort'])$(id).addEventListener('change',saveDisplayPreferences);
for(const id of ['#inventoryFilters','#bookingFilters'])$(id).addEventListener('toggle',saveDisplayPreferences);
if(displayAccount)restoreDisplayPreferences(displayAccount);

$('#finishReorder').onclick=()=>{reorderMode=false;render()};

let searchBackdropDown=false;function outsideSearchPanel(event){const r=$('#searchDialog').getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom}
$('#searchDialog').addEventListener('pointerdown',event=>{searchBackdropDown=event.target===$('#searchDialog')&&outsideSearchPanel(event)});
$('#searchDialog').addEventListener('click',event=>{if(searchBackdropDown&&event.target===$('#searchDialog')&&outsideSearchPanel(event))closeSearchPanel();searchBackdropDown=false});

const automaticDetailHomes=['#productInfoDetails','#colorInfoDetails'].map(id=>{const node=$(id);return {node,parent:node.parentNode,next:node.nextSibling}});
function setEditorMode(mode){editorEntryMode=mode;$('#editor').setAttribute('data-entry-mode',mode);$('#form .dialog-actions .primary').disabled=mode==='start'||!!window.spoolCatalogApplying;$('#saveAndContinue').disabled=mode==='start';window.spoolRefreshPermissions?.()}
let organizingAutofill=false;
function organizeAutofillDetails(){if(organizingAutofill)return;organizingAutofill=true;try{const automatic=PRODUCT_LIBRARY.some(x=>x.id===$('#editorProduct').value);if(automatic)setEditorMode('auto');else if(editorEntryMode==='auto')setEditorMode('manual');for(const home of automaticDetailHomes){if(!home.parent)continue;const active=document.activeElement;if(automatic){if(home.node.parentNode!==$('#advancedProductFields'))$('#advancedProductFields').append(home.node)}else if(home.node.parentNode!==home.parent){home.parent.insertBefore(home.node,home.next?.parentNode===home.parent?home.next:null)}if(active&&home.node.contains(active))active.focus?.({preventScroll:true})}}finally{organizingAutofill=false}}

const entryTemplateChange=$('#stockTemplate').onchange;$('#stockTemplate').onchange=()=>{if($('#stockTemplate').value)setEditorMode('manual');entryTemplateChange()};

function closeOnBackdrop(dialog,close){let outsideDown=false;const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};dialog.addEventListener('pointerdown',e=>{outsideDown=e.target===dialog&&outside(e)});dialog.addEventListener('click',e=>{if(outsideDown&&e.target===dialog&&outside(e))close();outsideDown=false});dialog.addEventListener('close',()=>{outsideDown=false})}
closeOnBackdrop($('#filamentDetails'),()=>$('#filamentDetails').close());
function searchByTag(tag,bookings=false){if(!tag)return;if(bookings){$('#bookingClass').value='';$('#bookingStatusFilter').value='';$('#bookingSearch').value='#'+tag;$('#bookingTagFilter').value='v:'+tag;renderBookings();openSearchPanel('bookings')}else{for(const id of ['#brand','#material','#variantFilter','#locationFilter'])$(id).value='';$('#search').value='#'+tag;setTab('all');$('#tagFilter').value='v:'+tag;render();openSearchPanel('inventory')}}
for(const [id,bookings]of [['#items',false],['#bookingView',true]])$(id).addEventListener('click',event=>{const button=event.target.closest?.('[data-search-tag]');if(!button)return;event.preventDefault();event.stopPropagation();searchByTag(button.dataset.searchTag,bookings)});

// Offer weights beside the field being edited, without a permanent preset bar.
let weightTarget=null,suppressWeightFocus=false;
function closeWeightCandidates(){const panel=$('#weightCandidates');panel.hidden=true;weightTarget?.setAttribute('aria-expanded','false');weightTarget=null}
function showWeightCandidates(field){
 closeWeightCandidates();weightTarget=field;
 const panel=$('#weightCandidates'),remaining=field.name==='remaining',capacity=Number($('#form').elements.namedItem('capacity').value);
 field.closest('label').append(panel);field.closest('label').classList.add('weight-field');
 panel.querySelector('span').textContent=remaining?'残量の候補':'1本の容量の候補';
 for(const button of panel.querySelectorAll('[data-spool-capacity]')){button.hidden=remaining&&Number(button.dataset.spoolCapacity)>capacity;button.setAttribute('aria-pressed',String(Number(button.dataset.spoolCapacity)===Number(field.value)))}
 $('#fillRemaining').hidden=!remaining;panel.hidden=false;field.setAttribute('aria-expanded','true');
 panel.classList.remove('above');const rect=panel.getBoundingClientRect(),bounds=$('#editor .editor-layout').getBoundingClientRect();if(rect.bottom>bounds.bottom&&rect.top-rect.height>bounds.top)panel.classList.add('above');
}
function chooseWeight(value){const target=weightTarget;if(!target)return;if(target.name==='capacity')applySpoolCapacity(value);else{target.value=String(value);updateDraftSummary()}closeWeightCandidates();suppressWeightFocus=true;target.focus?.({preventScroll:true});suppressWeightFocus=false;target.dispatchEvent(new Event('input',{bubbles:true}))}
for(const name of ['capacity','remaining']){const field=$('#form').elements.namedItem(name);field.setAttribute('aria-controls','weightCandidates');field.setAttribute('aria-expanded','false');field.addEventListener('focus',()=>{if(!suppressWeightFocus)showWeightCandidates(field)});field.addEventListener('click',()=>showWeightCandidates(field));field.addEventListener('keydown',e=>{if(e.key==='Escape'&&weightTarget){e.preventDefault();e.stopPropagation();closeWeightCandidates()}else if(e.key==='Tab')closeWeightCandidates();else if(e.key==='ArrowDown'&&!e.altKey){e.preventDefault();showWeightCandidates(field);$('#weightCandidates button:not([hidden])')?.focus()}})}
for(const name of ['capacity','remaining'])$('#form').elements.namedItem(name).addEventListener('input',closeWeightCandidates);
for(const button of $$('[data-spool-capacity]'))button.onclick=()=>chooseWeight(Number(button.dataset.spoolCapacity));
$('#fillRemaining').onclick=()=>chooseWeight(Number($('#form').elements.namedItem('capacity').value));
$('#weightCandidates').addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))e.preventDefault()});
$('#weightCandidates').addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){if(e.key==='Escape'){e.preventDefault();e.stopPropagation()}const field=weightTarget;closeWeightCandidates();suppressWeightFocus=true;field?.focus({preventScroll:true});suppressWeightFocus=false}});
document.addEventListener?.('pointerdown',e=>{if(weightTarget&&e.target!==weightTarget&&!$('#weightCandidates').contains(e.target))closeWeightCandidates()});
$('#editor').addEventListener('close',closeWeightCandidates);

function renderActiveInventoryFilters(){const root=$('#activeInventoryFilters');if(!root)return;const entries=[['search','検索'],['brand','ブランド'],['material','素材'],['variantFilter','種類'],['locationFilter','保管場所'],['tagFilter','タグ']].filter(([id])=>$('#'+id).value);root.hidden=!entries.length;root.innerHTML=entries.map(([id,label])=>{const field=$('#'+id),text=id==='search'?field.value:field.selectedOptions?.[0]?.textContent||field.value.replace(/^v:/,'');return '<button type="button" data-clear-filter="'+id+'" aria-label="'+esc(label+'：'+text+'を解除')+'">'+esc(label+'：'+text)+' <span aria-hidden="true">×</span></button>'}).join('')+(entries.length>1?'<button type="button" data-clear-filter="all" class="clear-all-filters">すべて解除</button>':'')}
$('#activeInventoryFilters').addEventListener('click',e=>{const button=e.target.closest?.('[data-clear-filter]');if(!button)return;const ids=button.dataset.clearFilter==='all'?['search','brand','material','variantFilter','locationFilter','tagFilter']:[button.dataset.clearFilter];for(const id of ids)$('#'+id).value='';render()});
renderActiveInventoryFilters();

$('#openModelHelp').onclick=()=>showModelOpenDialog();
