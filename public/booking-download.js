// ZIP downloads are scoped to a booking, inside its expanded file details.
let bookingDownloadJob=null,bookingDownloadUrl=null;
const bookingDownloadDialog=document.createElement('dialog');bookingDownloadDialog.id='bookingDownloadDialog';bookingDownloadDialog.className='booking-download-dialog';bookingDownloadDialog.setAttribute('aria-labelledby','bookingDownloadTitle');
bookingDownloadDialog.innerHTML='<div class="dialog-head"><h2 id="bookingDownloadTitle">モデルの一括保存</h2><button type="button" id="bookingDownloadClose" aria-label="一括保存を閉じる">×</button></div><div class="booking-download-body"><p id="bookingDownloadStatus" role="status" aria-live="polite"></p><progress id="bookingDownloadProgress"></progress><ul id="bookingDownloadIssues"></ul><p id="bookingDownloadError" class="error" role="alert"></p></div><div class="dialog-actions"><button type="button" id="bookingDownloadCancel">キャンセル</button><button type="button" class="primary" id="bookingDownloadSave" disabled>ZIPを保存</button></div>';document.body.append(bookingDownloadDialog);
function bookingDownloadKey(){const c=window.spoolBookingContext?.();return c?JSON.stringify([c.account,c.library]):typeof window.spoolBookingContext==='function'?'':'offline'}
function bookingDownloadFiles(x){return (x.attachments||[]).filter(validBookingAttachment)}
function decorateBookingDownloads(){
 if(bookingDownloadJob&&bookingDownloadJob.key!==bookingDownloadKey())cancelBookingDownload();
 $$('[data-booking-model-zip]').forEach(button=>button.remove());
 for(const booking of searchBookingResults){const files=bookingDownloadFiles(booking);if(files.length<2)continue;
  $$('[data-booking-id]').filter(row=>row.dataset.bookingId===booking.id).forEach(row=>{const slot=row.querySelector('.booking-model-download');if(!slot)return;const button=document.createElement('button');button.type='button';button.dataset.bookingModelZip=booking.id;button.className='booking-model-zip';button.innerHTML='<span>モデルを</span><span>一括ダウンロード</span><span>（'+files.length+'件）</span>';button.title='この予約の添付モデルをZIPで保存します。リンク・メモは含みません。';button.onclick=()=>startBookingModelDownload(booking.id);slot.append(button)});
 }
}
window.spoolBookingDownloadsRendered=decorateBookingDownloads;
function cancelBookingDownload(){const emitted=bookingDownloadJob?.emitted;if(bookingDownloadJob)bookingDownloadJob.cancelled=true;bookingDownloadJob=null;if(bookingDownloadUrl){const url=bookingDownloadUrl;if(emitted)setTimeout(()=>URL.revokeObjectURL(url),60000);else URL.revokeObjectURL(url);bookingDownloadUrl=null;}if(bookingDownloadDialog.open)bookingDownloadDialog.close();}
$('#bookingDownloadClose').onclick=$('#bookingDownloadCancel').onclick=cancelBookingDownload;bookingDownloadDialog.addEventListener('cancel',event=>{event.preventDefault();cancelBookingDownload()});bookingDownloadDialog.addEventListener('close',()=>{if(!bookingDownloadDialog.open)cancelBookingDownload()});
async function startBookingModelDownload(id){
 const booking=reservations.find(x=>x.id===id);if(!booking||bookingDownloadFiles(booking).length<2)return;
 cancelBookingDownload();const job={cancelled:false,busy:true,key:bookingDownloadKey(),online:window.spoolBookingDownloadContext?.()},entries=[],issues=[];bookingDownloadJob=job;
 const chosen=[booking],files=chosen.flatMap((booking,i)=>bookingDownloadFiles(booking).map(file=>({file,folder:String(i+1).padStart(3,'0')+' '+booking.title})));
 const check=()=>{if(job.cancelled||bookingDownloadJob!==job||job.key!==bookingDownloadKey())throw Error('表示先またはログイン状態が変わったため中止しました。');job.online?.();};
 $('#bookingDownloadSave').disabled=true;$('#bookingDownloadSave').textContent='ZIPを保存';$('#bookingDownloadError').textContent='';$('#bookingDownloadIssues').replaceChildren();$('#bookingDownloadProgress').hidden=false;$('#bookingDownloadProgress').max=files.length;$('#bookingDownloadProgress').value=0;$('#bookingDownloadStatus').textContent='添付を取得しています…';bookingDownloadDialog.showModal();
 try{
  if(files.length>100||files.reduce((n,x)=>n+x.file.size,0)>200*1024*1024)throw Error('1回100件・合計200MBまでです。個別にダウンロードしてください。');
  let total=0;for(const [i,{file,folder}] of files.entries()){
   check();$('#bookingDownloadStatus').textContent=(i+1)+' / '+files.length+'件：'+file.name;
   try{let blob,name=file.name;if(file.kind==='embedded'){const bytes=Uint8Array.from(atob(file.data.split(',')[1]),c=>c.charCodeAt(0));blob=new Blob([bytes]);}else{if(!window.spoolReadBookingAttachment)throw Error('オンライン版でログインしてください。');const result=await window.spoolReadBookingAttachment(file.id);blob=result.blob;name=result.name;}check();if(blob.size!==file.size)throw Error('添付のサイズが登録内容と異なります。');if(total+blob.size>200*1024*1024)throw Error('合計200MBを超えています。');entries.push({folder,name,blob});total+=blob.size;}
   catch(error){check();issues.push(file.name+'：'+(error.message||'取得できませんでした。'));}$('#bookingDownloadProgress').value=i+1;
  }
  check();for(const issue of issues){const li=document.createElement('li');li.textContent=issue;$('#bookingDownloadIssues').append(li);}
  if(!entries.length)throw Error('添付を取得できませんでした。権限・接続を確認して再度お試しください。');$('#bookingDownloadStatus').textContent='ZIPを作成しています…';const zip=await spoolModelZip.archive(entries);check();bookingDownloadUrl=URL.createObjectURL(zip);job.busy=false;
  $('#bookingDownloadStatus').textContent=entries.length+' / '+files.length+'件を取得しました。'+(issues.length?'取得できなかった添付を確認してください。':'この予約のフォルダーに元のファイル名で保存します。');$('#bookingDownloadSave').textContent=issues.length?'取得できた'+entries.length+'件をZIPで保存':'ZIPを保存';$('#bookingDownloadSave').disabled=false;
 }catch(error){if(bookingDownloadJob===job&&!job.cancelled){$('#bookingDownloadError').textContent=error.message;$('#bookingDownloadStatus').textContent='一括保存を完了できませんでした。';}}
 finally{if(bookingDownloadJob===job){job.busy=false;$('#bookingDownloadProgress').hidden=true;$('#bookingDownloadCancel').textContent='閉じる';}}
};
$('#bookingDownloadSave').onclick=()=>{try{bookingDownloadJob?.online?.();if(!bookingDownloadUrl||bookingDownloadJob?.key!==bookingDownloadKey())throw Error('表示先が変わりました。予約を選び直してください。');const link=document.createElement('a');link.href=bookingDownloadUrl;link.download='SPOOL-models-'+todayJST()+'.zip';document.body.append(link);bookingDownloadJob.emitted=true;link.click();link.remove();}catch(error){$('#bookingDownloadError').textContent=error.message;$('#bookingDownloadSave').disabled=true;}};
decorateBookingDownloads();
