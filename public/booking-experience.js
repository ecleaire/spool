// Booking workflow additions use the same offline/online form and permission checks.
let bookingQuickRange='all',bookingQuickMine=false;
function bookingQuickMatches(booking){
 const today=todayJST(),deadline=booking.deadline;
 if(bookingQuickMine&&booking.createdBy!==window.spoolCurrentUserId?.())return false;
 if(bookingQuickRange==='today')return deadline===today;
 if(bookingQuickRange==='overdue')return !!deadline&&deadline<today&&bookingStatus(booking)!=='印刷済み';
 if(bookingQuickRange==='week'){const day=new Date(today+'T00:00:00Z'),offset=(day.getUTCDay()+6)%7;day.setUTCDate(day.getUTCDate()-offset);const first=day.toISOString().slice(0,10);day.setUTCDate(day.getUTCDate()+6);return !!deadline&&deadline>=first&&deadline<=day.toISOString().slice(0,10)}return true;
}
function bookingQuickActive(){return bookingQuickRange!=='all'||bookingQuickMine}
function updateBookingQuickControls(){
 $$('[data-booking-range]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bookingRange===bookingQuickRange)));
 $('#bookingMine').setAttribute('aria-pressed',String(bookingQuickMine));$('#bookingMine').hidden=!window.spoolCurrentUserId?.();
}
$$('[data-booking-range]').forEach(button=>button.onclick=()=>{bookingQuickRange=button.dataset.bookingRange;renderBookings()});
$('#bookingMine').onclick=()=>{bookingQuickMine=!bookingQuickMine;renderBookings()};
window.spoolBookingProgress=(phase,details={})=>{
 const progress=$('#bookingSavingProgress'),copy=$('#bookingSavingCopy');progress.hidden=!details.total;
 if(details.total){progress.max=details.total;progress.value=details.completed||0;copy.textContent=(phase==='prepareFiles'?'添付を準備中':'添付をアップロード中')+'：'+(details.completed||0)+' / '+details.total+'件'+(details.name?'\n'+details.name:'');}
 else copy.textContent=({prepare:'入力内容を確認しています。',wait:'先の保存処理の完了を待っています。',save:'予約情報をオンラインに保存しています。',refresh:'保存結果を確認しています。',done:'保存が完了しました。'})[phase]||'予約情報を保存しています。';
};
let bookingDraftStorage;try{bookingDraftStorage=localStorage}catch{}
const bookingDraftStore=createBookingDraftStore(bookingDraftStorage);
const bookingDraftFields=['title','creator','desiredColor','registeredDate','weekday','className','quality','printStatus','printDuration','filamentGrams','filamentMeters','deadline','tags','files'];
let bookingDraftScope=null,bookingDraftSlot=null,bookingDraftWasNew=false,bookingDraftBaseline='',bookingDraftBaseSignature=null,bookingDraftTimer,bookingDraftRecoveredId=null,bookingDraftContext='',bookingDraftExpiresAt=null;
function bookingExperienceContext(){if(window.spoolBookingContext)return window.spoolBookingContext();if(storage.persistent!==false)return {account:'offline',library:'offline',name:'この端末のライブラリ',personal:true};return null}
function bookingExperienceKey(c=bookingExperienceContext()){return c?JSON.stringify([c.account,c.library]):''}
function validBookingDraftColor(value){try{const c=JSON.parse(value);return !!c&&typeof c.name==='string'&&c.name.length>0&&c.name.length<=200&&/^#[0-9a-f]{6}$/i.test(c.color)&&(c.preference===undefined||['specified','none','random'].includes(c.preference))&&(c.translucent===undefined||typeof c.translucent==='boolean')&&(c.filaments===undefined||Array.isArray(c.filaments)&&c.filaments.length<=64&&c.filaments.every(f=>f&&/^#[0-9a-f]{6}$/i.test(f.color)&&typeof f.type==='string'&&f.type.length<=40))}catch{return false}}
// File contents are never cached. Stable metadata keeps color assignments attached to re-added files.
let bookingDraftPendingInfo=[];
function normalizeBookingDraftFiles(value){return Array.isArray(value)?value.filter(f=>f&&typeof f.name==='string'&&f.name.length>0&&f.name.length<=240).slice(0,10).map(f=>({id:typeof f.id==='string'&&/^[0-9a-f-]{36}$/i.test(f.id)?f.id:crypto.randomUUID(),name:f.name,size:Number.isInteger(f.size)&&f.size>0&&f.size<=104857600?f.size:null,lastModified:Number.isFinite(f.lastModified)?f.lastModified:null})):[]}
const bookingPendingIdBeforeRecovery=bookingPendingId;
bookingPendingId=function(file){
 if(!bookingPendingIds.has(file)){
  const occupied=new Set(bookingPendingFiles.filter(f=>f!==file&&bookingPendingIds.has(f)).map(f=>bookingPendingIds.get(f)));
  const possible=bookingDraftPendingInfo.filter(f=>f.name===file.name&&(f.size===null||f.size===file.size)&&!occupied.has(f.id));
  const exact=possible.filter(f=>f.lastModified===file.lastModified),match=exact.length===1?exact[0]:possible.length===1?possible[0]:null;
  if(match)bookingPendingIds.set(file,match.id);
 }
 return bookingPendingIdBeforeRecovery(file);
};
function missingBookingDraftFiles(){const present=new Set([...bookingAttachments.map(f=>f.id),...bookingPendingFiles.map(bookingPendingId)]);return bookingDraftPendingInfo.filter(f=>!present.has(f.id))}
function bookingDraftFileSnapshot(){return [...bookingPendingFiles.map(f=>({id:bookingPendingId(f),name:f.name,size:f.size,lastModified:Number.isFinite(f.lastModified)?f.lastModified:null})),...missingBookingDraftFiles()].filter((f,i,a)=>a.findIndex(x=>x.id===f.id)===i)}
window.spoolBookingPendingRendered=()=>{
 const missing=missingBookingDraftFiles();if(!missing.length)return;
 $('#bookingFileListHeading').hidden=false;$('#bookingFileCount').textContent+=' / '+missing.length+'件再追加待ち';
 $('#bookingPendingFiles').insertAdjacentHTML('beforeend',missing.map(f=>'<li class="booking-draft-missing-file"><span><strong>'+esc(f.name)+'</strong><small>再追加が必要です（下書きにファイル本体は保存されていません）</small></span><button type="button" data-remove-draft-file="'+esc(f.id)+'" aria-label="'+esc(f.name)+'の再追加待ちを取り消す">取り消す</button></li>').join(''));
 $$('[data-remove-draft-file]').forEach(button=>button.onclick=()=>{const id=button.dataset.removeDraftFile;bookingDraftPendingInfo=bookingDraftPendingInfo.filter(f=>f.id!==id);bookingModelColors=bookingModelColors.filter(c=>c.kind!=='attachment'||c.id!==id);renderBookingPendingFiles();persistBookingDraft();$('#bookingDraftStatus').textContent='再追加待ちの情報を取り消しました。保存済みファイルは削除していません。'});
};
window.spoolBookingBeforeSave=()=>{const missing=missingBookingDraftFiles();if(!missing.length)return true;$('#bookingError').textContent=missing.length+'件の添付が再追加待ちです。ファイルを追加するか、不要な待ち情報を取り消してください。';$('#bookingPendingFiles').scrollIntoView?.({block:'center'});return false};
window.spoolBookingFilesCommitted=(files,uploaded)=>{
 for(const [i,attachment] of uploaded.entries()){const file=files[i];if(!file)continue;const previous=bookingPendingId(file);bookingModelColors=bookingModelColors.map(c=>c.kind==='attachment'&&c.id===previous?{...c,id:attachment.id}:c);bookingDraftPendingInfo=bookingDraftPendingInfo.filter(f=>f.id!==previous);bookingPendingIds.set(file,attachment.id);}
};
function bookingDraftForm(){return {filamentUsage:bookingFilamentUsageSnapshot(),fields:Object.fromEntries(bookingDraftFields.map(name=>[name,String($('#bookingForm').elements.namedItem(name).value||'')])),unknownDeadline:$('#bookingDeadlineUnknown').checked,autoDeadline:bookingAutoDeadline!==null,modelColors:structuredClone(bookingModelColors),attachmentIds:bookingAttachments.map(x=>x.id),savedAttachments:bookingAttachments.map(f=>({id:f.id,name:f.name,size:f.size,kind:f.kind})),pendingFiles:bookingDraftFileSnapshot(),pendingNames:bookingDraftFileSnapshot().map(f=>f.name)}}
function bookingDraftSignature(booking){if(!booking)return null;const {attachments,...data}=booking;delete data._sharedBookingSource;return JSON.stringify({...data,attachments:(attachments||[]).map(x=>({id:x.id,name:x.name,size:x.size}))})}
function persistBookingDraft(){
 clearTimeout(bookingDraftTimer);if(!bookingDraftScope||bookingDraftSlot===null||bookingSaving)return;
 const data=bookingDraftForm();if(JSON.stringify(data)===bookingDraftBaseline)return;
 try{const savedDraft=bookingDraftStore.save(bookingDraftScope,bookingDraftSlot,{...data,bookingId:bookingEditId||bookingDraftRecoveredId,wasNew:bookingDraftWasNew,baseSignature:bookingDraftBaseSignature});bookingDraftExpiresAt=savedDraft.expiresAt;$('#bookingDraftStatus').textContent='下書き保存済み（この端末・24時間で削除）';updateBookingDraftBanner()}
 catch(error){$('#bookingDraftStatus').textContent=error.name==='QuotaExceededError'?'この端末の保存容量が不足しています。画面を閉じる前に入力内容を控えてください。':'下書きを保存できません。画面を閉じる前に入力内容を控えてください。'}
}
function scheduleBookingDraft(){if($('#bookingDialog').open&&!bookingSaving){clearTimeout(bookingDraftTimer);bookingDraftTimer=setTimeout(persistBookingDraft,400)}}
function updateBookingDraftBanner(){
 bookingDraftStore.cleanup();if(bookingDraftScope&&bookingDraftExpiresAt&&Date.now()>=bookingDraftExpiresAt&&$('#bookingDialog').open&&!bookingSaving)$('#bookingDraftStatus').textContent='下書きの保存期限が切れました。入力を変更すると再度保存します。';const drafts=bookingDraftStore.list(bookingExperienceContext()),select=$('#bookingDraftPicker'),previous=select.value;
 $('#bookingDraftBanner').hidden=!drafts.length;$('#bookingDraftHeading').textContent='この端末の下書き '+drafts.length+'件';
 select.innerHTML=drafts.map(d=>'<option value="'+esc(d.slot)+'">'+esc(d.data.fields?.title||'作品名未入力')+' · '+esc(new Date(d.updatedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))+'</option>').join('');if(drafts.some(d=>d.slot===previous))select.value=previous;
}
function beginBookingDraft(){
 if(!$('#bookingDialog').open)return;const c=bookingExperienceContext();bookingDraftScope=c?{account:c.account,library:c.library}:null;bookingDraftSlot=bookingEditId||'new-'+crypto.randomUUID();bookingDraftWasNew=!bookingEditId;bookingDraftRecoveredId=null;bookingDraftExpiresAt=null;bookingDraftBaseSignature=bookingDraftSignature(reservations.find(x=>x.id===bookingEditId));bookingDraftBaseline=JSON.stringify(bookingDraftForm());$('#bookingDraftStatus').textContent=bookingDraftScope?'下書きはこの端末に保存し、24時間で自動削除します。':'';
}
const openBookingBeforeExperience=openBooking;
openBooking=function(id){if(bookingSaving)return;bookingDraftPendingInfo=[];openBookingBeforeExperience(id);beginBookingDraft()};
window.spoolBookingDraftPreparing=id=>{if(bookingDraftWasNew)bookingDraftRecoveredId=id;persistBookingDraft()};
window.spoolBookingDraftId=()=>bookingDraftRecoveredId;
window.spoolBookingSaveCompleted=()=>{clearTimeout(bookingDraftTimer);bookingDraftPendingInfo=[];if(bookingDraftScope&&bookingDraftSlot!==null)bookingDraftStore.remove(bookingDraftScope,bookingDraftSlot);bookingDraftBaseline=JSON.stringify(bookingDraftForm());bookingDraftSlot=null;bookingDraftRecoveredId=null;bookingDraftExpiresAt=null;updateBookingDraftBanner()};
$('#bookingForm').addEventListener('input',scheduleBookingDraft);$('#bookingForm').addEventListener('change',scheduleBookingDraft);$('#bookingForm').addEventListener('click',()=>setTimeout(scheduleBookingDraft,0));
$('#bookingForm').addEventListener('submit',persistBookingDraft,true);
window.spoolBookingWillClose=()=>{persistBookingDraft();bookingDraftScope=null;bookingDraftSlot=null;updateBookingDraftBanner()};
$('#bookingDialog').addEventListener('close',()=>{if(!$('#bookingDialog').open)window.spoolBookingWillClose()});
$('#bookingDialog').addEventListener('cancel',event=>{if(!event.defaultPrevented&&!bookingSaving)window.spoolBookingWillClose()});
$('#bookingDraftRestore').onclick=()=>{
 const c=bookingExperienceContext(),draft=bookingDraftStore.list(c).find(x=>x.slot===$('#bookingDraftPicker').value);if(!draft){updateBookingDraftBanner();toast('下書きは期限切れ、または削除済みです。');return}
 if($('#bookingDialog').open&&JSON.stringify(bookingDraftForm())!==bookingDraftBaseline&&!confirm('現在の入力を下書きで置き換えますか？'))return;
 const raw=draft.data,data={...raw,bookingId:typeof raw.bookingId==='string'&&raw.bookingId.length<=120?raw.bookingId:null,pendingNames:Array.isArray(raw.pendingNames)?raw.pendingNames.filter(x=>typeof x==='string'&&x.length<=240).slice(0,10):[],attachmentIds:Array.isArray(raw.attachmentIds)?raw.attachmentIds.filter(x=>typeof x==='string'&&x.length<=120).slice(0,10):[]},original=reservations.find(x=>x.id===data.bookingId);
 if(!data.wasNew&&!original&&!confirm('元の予約が見つかりません。新規予約として復元しますか？'))return;
 if(original&&data.baseSignature&&bookingDraftSignature(original)!==data.baseSignature&&!confirm('元の予約が更新されています。下書きを復元して内容を確認しますか？ 保存するまで原本は変更されません。'))return;
 openBooking(original?.id);if(!$('#bookingDialog').open||bookingExperienceKey(c)!==bookingExperienceKey())return;
 let invalidColor=false;for(const name of bookingDraftFields){const value=data.fields?.[name];if(name==='desiredColor'&&value&&!validBookingDraftColor(value)){invalidColor=true;continue;}if(typeof value==='string'&&value.length<=22000)$('#bookingForm').elements.namedItem(name).value=value;}
 setBookingFilamentUsage(validFilamentUsage(data.filamentUsage)?data.filamentUsage:null);for(const name of ['filamentGrams','filamentMeters'])if(typeof data.fields?.[name]==='string')$('#bookingForm').elements.namedItem(name).value=data.fields[name];$('#bookingUsageDetails').open=!!data.filamentUsage;$('#bookingDeadlineUnknown').checked=!!data.unknownDeadline;updateBookingDeadline();const dates=$('#bookingForm').elements;bookingAutoDeadline=!bookingEditId&&data.autoDeadline!==false&&dates.namedItem('deadline').value===bookingDefaultDeadline(dates.namedItem('registeredDate').value)?dates.namedItem('deadline').value:null;
 bookingAttachments=(original?.attachments||[]).filter(x=>data.attachmentIds?.includes(x.id));bookingPendingFiles=[];bookingModelColors=validBookingModelColors(data.modelColors)?structuredClone(data.modelColors):[];
 const pending=normalizeBookingDraftFiles(data.pendingFiles),orphaned=normalizeBookingDraftFiles(Array.isArray(data.savedAttachments)?data.savedAttachments.filter(f=>!bookingAttachments.some(a=>a.id===f?.id)):[]);
 const legacyPending=!Array.isArray(data.pendingFiles)&&data.pendingNames.length>0;
 bookingDraftPendingInfo=[...(legacyPending?normalizeBookingDraftFiles(data.pendingNames.map(name=>({name}))):pending),...orphaned].filter((f,i,a)=>a.findIndex(x=>x.id===f.id)===i);
 if(legacyPending)bookingModelColors=bookingModelColors.filter(c=>c.kind!=='attachment'||bookingAttachments.some(f=>f.id===c.id));
 bookingDraftSlot=draft.slot;bookingDraftExpiresAt=draft.expiresAt;bookingDraftWasNew=!!data.wasNew;bookingDraftRecoveredId=!original&&data.wasNew?data.bookingId:null;bookingDraftBaseSignature=bookingDraftSignature(original);renderBookingColors(original);renderBookingPendingFiles();
 $('#bookingDraftStatus').textContent='下書きを復元しました。'+(invalidColor?'色指定を読み取れないため、希望色を選び直してください。':'')+(legacyPending?'旧形式の未保存添付は、再追加後に色を選び直してください。':'')+(data.pendingNames?.length?'未保存の添付（'+data.pendingNames.join('、')+'）は再度追加してください。':'内容を確認して保存してください。');bookingDraftBaseline='';
};
$('#bookingDraftDiscard').onclick=()=>{const c=bookingExperienceContext(),slot=$('#bookingDraftPicker').value;if(c&&confirm('この下書きを削除しますか？ 保存済みの予約は削除されません。')){bookingDraftStore.remove(c,slot);updateBookingDraftBanner()}};
window.spoolBookingContextChanged=()=>{
 const key=bookingExperienceKey();if(key!==bookingDraftContext){clearTimeout(bookingDraftTimer);if(bookingDraftScope&&$('#bookingDialog').open){persistBookingDraft();bookingDraftScope=null;bookingDraftSlot=null;$('#bookingDialog').close();bookingPendingFiles=[];bookingAttachments=[];bookingDraftPendingInfo=[];bookingModelColors=[];bookingEditId=null;}$('#bookingReviewDialog').close();bookingQuickMine=false;bookingDraftContext=key;}
 updateBookingQuickControls();updateBookingDraftBanner();
};
function bookingSharingLabel(booking){const context=bookingExperienceContext();if(booking._sharedBookingSource)return '同期元：'+booking._sharedBookingSource.name+' · 変更は原本にも反映';if(context?.personal===false)return '共有中：'+context.name;return window.spoolBookingSharingLabel?.(booking)||'この端末の予約'}
function openBookingReview(id){
 const booking=reservations.find(x=>x.id===id);if(!booking)return;const dialog=$('#bookingReviewDialog'),files=[...(booking.attachments||[]).map(x=>({kind:'attachment',id:x.id,name:x.name})),...(booking.files||[]).filter(validBookingFile).map(value=>({kind:'reference',id:value,name:bookingModelReferenceName(value)}))];
 $('#bookingReviewTitle').textContent='印刷前の確認';$('#bookingReviewScope').textContent=bookingSharingLabel(booking);
 $('#bookingReviewBody').innerHTML='<h3 class="booking-review-work">'+esc(booking.title)+'</h3><dl class="booking-review-facts"><div><dt>期限</dt><dd>'+esc(booking.deadline?displayDate(booking.deadline):'未定')+'</dd></div><div><dt>印刷時間</dt><dd>'+esc(durationLabel(booking.printMinutes))+'</dd></div><div><dt>仕上がり</dt><dd>'+esc(bookingQualityLabel(booking.quality))+'</dd></div><div><dt>印刷情報</dt><dd>'+esc(bookingStatus(booking))+'</dd></div><div><dt>製作者</dt><dd>'+esc(booking.creator||'未記入')+'</dd></div><div><dt>予約全体の希望色</dt><dd>'+bookingColorSwatches(booking)+' '+esc(displayColorName(booking.desiredColor))+'</dd></div></dl>'+bookingFilamentUsageMarkup(booking)+'<h3>モデルと希望色</h3>'+(files.length?compactBookingFileList(files.map(file=>{const override=(booking.modelColors||[]).find(x=>x.kind===file.kind&&x.id===file.id),color=override||booking;return '<div class="booking-review-model"><strong>'+esc(file.name)+'</strong><span><i class="booking-color-chip" style="background:'+esc(color.color)+'" aria-hidden="true"></i>'+esc(displayColorName(color.desiredColor))+(override?'':'（共通）')+'</span></div>'}),'モデルと希望色'):'<p>関連モデルは未登録です。</p>')+'<h3>関連ファイル・メモ</h3>'+bookingFileMarkup(booking,false);
 bindModelFileActions();const edit=$('#bookingReviewEdit');edit.hidden=!!window.spoolCan&&!window.spoolCan('bookings_edit');edit.onclick=()=>{dialog.close();openBooking(id)};dialog.showModal();
}
$('#bookingReviewClose').onclick=$('#bookingReviewDone').onclick=()=>$('#bookingReviewDialog').close();
$('#bookingReviewDialog').addEventListener('close',()=>$('#bookingReviewBody').replaceChildren());
window.spoolBookingSharingChanged=()=>renderBookings();
bookingDraftStore.cleanup();window.spoolBookingContextChanged();renderBookings();
if(typeof setInterval==='function')setInterval(()=>{bookingDraftStore.cleanup();updateBookingDraftBanner()},60000);
window.addEventListener('pagehide',persistBookingDraft);window.addEventListener('storage',event=>{if(event.key?.startsWith('spool-booking-draft-v1:'))updateBookingDraftBanner()});

window.spoolBookingQuickMatches=bookingQuickMatches;
window.spoolBookingQuickActive=bookingQuickActive;
window.spoolBookingResetQuick=()=>{bookingQuickRange='all';bookingQuickMine=false};
window.spoolBookingSharingMarkup=booking=>'<small class="booking-sharing-state">'+esc(bookingSharingLabel(booking))+'</small>';
window.spoolBookingExperienceRendered=()=>{updateBookingQuickControls();$$('[data-review-booking]').forEach(button=>button.onclick=()=>openBookingReview(button.dataset.reviewBooking))};
renderBookings();
