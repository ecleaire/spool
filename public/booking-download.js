// Selection applies to the currently displayed results and never changes booking data.
let bookingDownloadSelected=new Set(),bookingDownloadScope='',bookingDownloadJob=null,bookingDownloadUrl=null;
const bookingDownloadBar=document.createElement('details');bookingDownloadBar.id='bookingDownloadTools';bookingDownloadBar.className='booking-download-tools';
bookingDownloadBar.innerHTML='<summary>モデルを一括ダウンロード <span id="bookingDownloadCount"></span></summary><div class="booking-download-actions"><button type="button" id="bookingDownloadAll">表示中をすべて選択</button><button type="button" id="bookingDownloadClear">選択解除</button><button type="button" class="primary" id="bookingDownloadStart" disabled>選択した予約の添付をZIPで保存</button></div><p>添付済みの3Dモデル・スライスデータが対象です。パス・リンク・テキストは含みません。1回100件・合計200MBまで。</p>';
$('.booking-overview-header').after(bookingDownloadBar);
$('#bookingDownloadToggle').onclick=()=>{bookingDownloadBar.open=!bookingDownloadBar.open;$('#bookingDownloadToggle').setAttribute('aria-expanded',String(bookingDownloadBar.open));if(bookingDownloadBar.open)bookingDownloadBar.scrollIntoView({block:'nearest',behavior:'smooth'});};
const bookingDownloadDialog=document.createElement('dialog');bookingDownloadDialog.id='bookingDownloadDialog';bookingDownloadDialog.className='booking-download-dialog';bookingDownloadDialog.setAttribute('aria-labelledby','bookingDownloadTitle');
bookingDownloadDialog.innerHTML='<div class="dialog-head"><h2 id="bookingDownloadTitle">モデルの一括保存</h2><button type="button" id="bookingDownloadClose" aria-label="一括保存を閉じる">×</button></div><div class="booking-download-body"><p id="bookingDownloadStatus" role="status" aria-live="polite"></p><progress id="bookingDownloadProgress"></progress><ul id="bookingDownloadIssues"></ul><p id="bookingDownloadError" class="error" role="alert"></p></div><div class="dialog-actions"><button type="button" id="bookingDownloadCancel">キャンセル</button><button type="button" class="primary" id="bookingDownloadSave" disabled>ZIPを保存</button></div>';document.body.append(bookingDownloadDialog);
function bookingDownloadKey(){const c=window.spoolBookingContext?.();return c?JSON.stringify([c.account,c.library]):storage.persistent!==false?'offline':''}
function bookingDownloadFiles(x){return (x.attachments||[]).filter(validBookingAttachment)}
function refreshBookingDownloadSelection(){
 const key=bookingDownloadKey();if(key!==bookingDownloadScope){bookingDownloadSelected.clear();bookingDownloadScope=key;cancelBookingDownload();}
 const visible=new Set(searchBookingResults.map(x=>x.id));bookingDownloadSelected=new Set([...bookingDownloadSelected].filter(id=>visible.has(id)));
 const count=searchBookingResults.filter(x=>bookingDownloadSelected.has(x.id)),files=count.reduce((n,x)=>n+bookingDownloadFiles(x).length,0);$('#bookingDownloadCount').textContent=count.length?count.length+'件選択・添付'+files+'件':'';
 $('#bookingDownloadStart').disabled=!files||!!bookingDownloadJob?.busy;$('#bookingDownloadClear').disabled=!count.length;$('#bookingDownloadAll').disabled=!searchBookingResults.some(x=>bookingDownloadFiles(x).length);
 $$('[data-download-booking]').forEach(input=>{input.checked=bookingDownloadSelected.has(input.dataset.downloadBooking)});
}
function decorateBookingDownloads(){
 $$('[data-download-booking]').forEach(x=>x.closest('.booking-download-select').remove());
 for(const x of searchBookingResults){const files=bookingDownloadFiles(x);if(!files.length)continue;
  $$('[data-booking-id]').filter(el=>el.dataset.bookingId===x.id).forEach(el=>{const target=el.matches('tr')?el.querySelector('.work-cell'):el.querySelector('.booking-card-top');if(!target)return;const label=document.createElement('label');label.className='booking-download-select';label.hidden=!bookingDownloadBar.open;const input=document.createElement('input');input.type='checkbox';input.dataset.downloadBooking=x.id;input.setAttribute('aria-label',x.title+'の添付を選択');const text=document.createElement('span');text.textContent='添付 '+files.length+'件を選択';label.append(input,text);target.prepend(label);input.onchange=()=>{if(input.checked)bookingDownloadSelected.add(x.id);else bookingDownloadSelected.delete(x.id);refreshBookingDownloadSelection()};});
 }refreshBookingDownloadSelection();
}
window.spoolBookingDownloadsRendered=decorateBookingDownloads;bookingDownloadBar.addEventListener('toggle',()=>{$('#bookingDownloadToggle').setAttribute('aria-expanded',String(bookingDownloadBar.open));$$('.booking-download-select').forEach(label=>label.hidden=!bookingDownloadBar.open)});
$('#bookingDownloadAll').onclick=()=>{searchBookingResults.filter(x=>bookingDownloadFiles(x).length).forEach(x=>bookingDownloadSelected.add(x.id));refreshBookingDownloadSelection()};$('#bookingDownloadClear').onclick=()=>{bookingDownloadSelected.clear();refreshBookingDownloadSelection()};
function cancelBookingDownload(){const emitted=bookingDownloadJob?.emitted;if(bookingDownloadJob)bookingDownloadJob.cancelled=true;bookingDownloadJob=null;if(bookingDownloadUrl){const url=bookingDownloadUrl;if(emitted)setTimeout(()=>URL.revokeObjectURL(url),60000);else URL.revokeObjectURL(url);bookingDownloadUrl=null;}if(bookingDownloadDialog.open)bookingDownloadDialog.close();}
$('#bookingDownloadClose').onclick=$('#bookingDownloadCancel').onclick=cancelBookingDownload;bookingDownloadDialog.addEventListener('cancel',event=>{event.preventDefault();cancelBookingDownload();refreshBookingDownloadSelection()});bookingDownloadDialog.addEventListener('close',()=>{refreshBookingDownloadSelection()});
$('#bookingDownloadStart').onclick=async()=>{
 cancelBookingDownload();const job={cancelled:false,busy:true,key:bookingDownloadKey(),online:window.spoolBookingDownloadContext?.()},entries=[],issues=[];bookingDownloadJob=job;
 const chosen=searchBookingResults.filter(x=>bookingDownloadSelected.has(x.id)),files=chosen.flatMap((booking,i)=>bookingDownloadFiles(booking).map(file=>({file,folder:String(i+1).padStart(3,'0')+' '+booking.title})));
 const check=()=>{if(job.cancelled||bookingDownloadJob!==job||job.key!==bookingDownloadKey())throw Error('表示先またはログイン状態が変わったため中止しました。');job.online?.();};
 $('#bookingDownloadSave').disabled=true;$('#bookingDownloadSave').textContent='ZIPを保存';$('#bookingDownloadError').textContent='';$('#bookingDownloadIssues').replaceChildren();$('#bookingDownloadProgress').hidden=false;$('#bookingDownloadProgress').max=files.length;$('#bookingDownloadProgress').value=0;$('#bookingDownloadStatus').textContent='添付を取得しています…';bookingDownloadDialog.showModal();refreshBookingDownloadSelection();
 try{
  if(files.length>100||files.reduce((n,x)=>n+x.file.size,0)>200*1024*1024)throw Error('1回100件・合計200MBまでです。予約を分けて選択してください。');
  let total=0;for(const [i,{file,folder}] of files.entries()){
   check();$('#bookingDownloadStatus').textContent=(i+1)+' / '+files.length+'件：'+file.name;
   try{let blob,name=file.name;if(file.kind==='embedded'){const bytes=Uint8Array.from(atob(file.data.split(',')[1]),c=>c.charCodeAt(0));blob=new Blob([bytes]);}else{if(!window.spoolReadBookingAttachment)throw Error('オンライン版でログインしてください。');const result=await window.spoolReadBookingAttachment(file.id);blob=result.blob;name=result.name;}check();if(blob.size!==file.size)throw Error('添付のサイズが登録内容と異なります。');if(total+blob.size>200*1024*1024)throw Error('合計200MBを超えています。');entries.push({folder,name,blob});total+=blob.size;}
   catch(error){check();issues.push(file.name+'：'+(error.message||'取得できませんでした。'));}$('#bookingDownloadProgress').value=i+1;
  }
  check();for(const issue of issues){const li=document.createElement('li');li.textContent=issue;$('#bookingDownloadIssues').append(li);}
  if(!entries.length)throw Error('添付を取得できませんでした。権限・接続を確認して再度お試しください。');$('#bookingDownloadStatus').textContent='ZIPを作成しています…';const zip=await spoolModelZip.archive(entries);check();bookingDownloadUrl=URL.createObjectURL(zip);job.busy=false;
  $('#bookingDownloadStatus').textContent=entries.length+' / '+files.length+'件を取得しました。'+(issues.length?'取得できなかった添付を確認してください。':'予約ごとのフォルダーに元のファイル名で保存します。');$('#bookingDownloadSave').textContent=issues.length?'取得できた'+entries.length+'件をZIPで保存':'ZIPを保存';$('#bookingDownloadSave').disabled=false;
 }catch(error){if(bookingDownloadJob===job&&!job.cancelled){$('#bookingDownloadError').textContent=error.message;$('#bookingDownloadStatus').textContent='一括保存を完了できませんでした。';}}
 finally{if(bookingDownloadJob===job){job.busy=false;$('#bookingDownloadProgress').hidden=true;$('#bookingDownloadCancel').textContent='閉じる';refreshBookingDownloadSelection();}}
};
$('#bookingDownloadSave').onclick=()=>{try{bookingDownloadJob?.online?.();if(!bookingDownloadUrl||bookingDownloadJob?.key!==bookingDownloadKey())throw Error('表示先が変わりました。予約を選び直してください。');const link=document.createElement('a');link.href=bookingDownloadUrl;link.download='SPOOL-models-'+todayJST()+'.zip';document.body.append(link);bookingDownloadJob.emitted=true;link.click();link.remove();}catch(error){$('#bookingDownloadError').textContent=error.message;$('#bookingDownloadSave').disabled=true;}};
decorateBookingDownloads();
