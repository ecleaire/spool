function validBookingAttachment(x){return x&&typeof x.id==='string'&&x.id.length<=120&&typeof x.name==='string'&&x.name.length>0&&x.name.length<=240&&/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(x.name)&&Number.isInteger(x.size)&&x.size>0&&((x.kind==='online'&&x.size<=104857600&&!x.data)||(x.kind==='embedded'&&x.size<=5242880&&typeof x.data==='string'&&/^data:application\/octet-stream;base64,[A-Za-z0-9+/]*={0,2}$/.test(x.data)&&x.data.length<=Math.ceil(x.size/3)*4+100))}
// File references travel with the booking JSON; model contents stay in their folders.
function validBookingFile(value){
  if(typeof value!=='string'||!value||value.length>2048||/[\x00-\x1f"<>|]/.test(value))return false;
  if(/^https:\/\//i.test(value)){try{const url=new URL(value);return !!url.hostname&&!url.username&&!url.password&&/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(url.pathname)}catch{return false}}
  return !/[?*]/.test(value)&&/^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/])/.test(value)&&!/^\\\\[?.]\\/.test(value)&&!value.slice(2).includes(':')&&/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(value);
}

const MODEL_HELPER_DOWNLOAD=MODEL_HELPER_DOWNLOAD_PLACEHOLDER;
function modelFileSize(size){return size>=1048576?(size/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(size/1024))+' KB'}
function modelProtocolLink(file){
 if(file.path){if(!validBookingFile(file.path)||/^https:/i.test(file.path))throw Error('Windowsのファイル保存先を確認してください。');return 'spool-open://open/?path='+encodeURIComponent(file.path)}
 if(!file.name||!/^.{1,240}\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(file.name)||/[\x00-\x1f"<>|?*:/\\]/.test(file.name))throw Error('対応するモデルファイル名を指定してください。');
 if(file.url){const url=new URL(file.url);if(url.protocol!=='https:'||url.username||url.password)throw Error('添付のURLを確認してください。');return 'spool-open://open/?url='+encodeURIComponent(url.href)+'&name='+encodeURIComponent(file.name)}
 return 'spool-open://pick/?name='+encodeURIComponent(file.name);
}
function modelHelperMarkup(){return '<details class="model-helper-help"><summary>初回設定・アプリが開かない場合</summary><p>補助ツールを展開して SPOOL.FileOpener.exe を実行すると、このWindowsユーザーに連携を登録します。既定アプリの関連付けは変更しません。</p><a class="model-helper-download" href="'+MODEL_HELPER_DOWNLOAD+'" download="SPOOL-file-helper.zip">Windows用連携ツールをダウンロード</a><p>モデルの拡張子を、Windowsで使用するスライスアプリに関連付けてください。スマホなど未対応の端末では「ダウンロード」を利用できます。</p></details>'}
function showModelOpenDialog(file){
 document.querySelector('#modelOpenDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='modelOpenDialog';dialog.className='workspace-dialog model-open-dialog';dialog.setAttribute('aria-labelledby','modelOpenTitle');
 const body=!file?modelHelperMarkup():file.path?'<p>Windowsに登録された既定アプリで、このファイルを開きます。</p><a class="primary model-open-link" href="'+esc(modelProtocolLink(file))+'">既定アプリで開く</a>':file.url?'<p>オンライン添付をPCの一時フォルダーへ保存してから、既定アプリで開きます。</p><a class="primary model-open-link" href="'+esc(modelProtocolLink(file))+'">既定アプリで開く</a>':'<p>ファイルをダウンロードした後、保存したファイルを選んで開きます。</p>'+(file.data?'<a class="model-download-link" href="'+esc(file.data)+'" download="'+esc(file.name)+'">① ファイルをダウンロード</a>':'')+'<a class="primary model-open-link" href="'+esc(modelProtocolLink(file))+'">② 保存したファイルを選んで開く</a>';
 dialog.innerHTML='<div class="dialog-head"><h2 id="modelOpenTitle">'+(file?'スライスアプリで開く':'アプリ連携の設定')+'</h2><button type="button" aria-label="アプリ連携を閉じる">×</button></div><div class="model-open-body">'+(file?'<strong class="model-open-name">'+esc(file.name)+'</strong>':'')+body+(file?'<p class="model-open-status" role="status"></p>'+modelHelperMarkup():'')+'</div>';
 document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();dialog.querySelector('.model-open-link')?.addEventListener('click',()=>{dialog.querySelector('.model-open-status').textContent='ブラウザーに確認が出たら「開く」を選んでください。反応がない場合は、下の初回設定を行ってから、もう一度お試しください。';dialog.querySelector('details').open=true});if(!file)dialog.querySelector('details').open=true;
}
window.spoolShowModelOpen=showModelOpenDialog;
function modelAttachmentActions(file){return '<span class="model-file-actions">'+(file.kind==='embedded'?'<a class="booking-file" href="'+esc(file.data)+'" download="'+esc(file.name)+'">ダウンロード</a><button type="button" data-open-embedded-file="'+esc(file.id)+'">アプリで開く</button>':'<button type="button" class="booking-file" data-booking-attachment="'+esc(file.id)+'">ダウンロード</button><button type="button" data-open-booking-attachment="'+esc(file.id)+'">アプリで開く</button>')+'</span>'}
function bindModelFileActions(){
 $$('[data-model-path]').forEach(link=>link.onclick=event=>{event.preventDefault();const path=link.dataset.modelPath;showModelOpenDialog({path,name:path.split(/[\\/]/).pop()})});
 $$('[data-booking-attachment],[data-open-booking-attachment]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const opening=!!button.dataset.openBookingAttachment,action=opening?window.spoolOpenBookingAttachment:window.spoolDownloadBookingAttachment;if(!action)throw Error('オンライン版でログインして添付を取得してください。');await action(button.dataset.openBookingAttachment||button.dataset.bookingAttachment)}catch(error){toast(error.message)}finally{button.disabled=false}});
 $$('[data-open-embedded-file]').forEach(button=>button.onclick=()=>{const file=[...reservations.flatMap(x=>x.attachments||[]),...bookingAttachments].find(x=>x.id===button.dataset.openEmbeddedFile);if(file)showModelOpenDialog(file)});
}
function bookingFileMarkup(booking){return (booking.files||[]).map(file=>{
 const remote=/^https:\/\//i.test(file);let name=remote?new URL(file).pathname.split('/').pop():file.split(/[\\/]/).pop();if(remote){try{name=decodeURIComponent(name)}catch{}}
 const href=remote?file:modelProtocolLink({path:file});
 return '<div class="model-file-row"><span class="model-file-name">'+esc(name)+'</span><a class="booking-file" href="'+esc(href)+'"'+(remote?' target="_blank" rel="noopener noreferrer"':' data-model-path="'+esc(file)+'"')+' title="'+esc(file)+'">'+(remote?'ファイルを開く／取得':'既定アプリで開く')+'</a></div>';
}).join('')+(booking.attachments||[]).map(file=>'<div class="model-file-row"><span class="model-file-name">'+esc(file.name)+'<small>'+modelFileSize(file.size)+' · '+(file.kind==='embedded'?'バックアップに同梱':'オンライン添付')+'</small></span>'+modelAttachmentActions(file)+'</div>').join('')}
