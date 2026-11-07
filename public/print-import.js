let bookingImportRows=[],bookingImportEpoch=0,bookingReading=false,bookingImportSelection=new Set();
function bookingImportValues(){const f=$('#bookingForm').elements;return {duration:f.namedItem('printDuration').value,color:$('#bookingColor').value,quality:f.namedItem('quality').value,usage:JSON.stringify(bookingFilamentUsageSnapshot())}}
function resetBookingImport(){bookingImportEpoch++;bookingReading=false;bookingImportRows=[];bookingImportSelection.clear();$('#bookingImportPlates').open=false;$('#bookingImportPanel').hidden=true;$('#bookingImportFeedback').hidden=true;$('#bookingImportFeedback').textContent='';}
function bookingImportRowKey(row){return row.attachmentId+':'+String(row.plate||'')}
function selectedPrintMetadata(){const rows=bookingImportRows.filter(row=>bookingImportSelection.has(bookingImportRowKey(row)));return rows.length?aggregatePrintMetadata(rows):null}
function renderImportPlateChoices(){
 $('#bookingImportPlateChoices').innerHTML=bookingImportRows.map((row,i)=>'<label><input type="checkbox" data-import-plate="'+i+'"'+(bookingImportSelection.has(bookingImportRowKey(row))?' checked':'')+'><span><strong>'+esc(row.file.name+(row.plate?' / プレート '+row.plate:''))+'</strong><small>'+esc(row.seconds?durationLabel(Math.ceil(row.seconds/60)):'時間未取得')+' · '+esc(row.filamentUsage?filamentUsageLabel(row.filamentUsage)||'消費量未取得':'消費量未取得')+'</small></span></label>').join('');
 $$('[data-import-plate]').forEach(input=>input.onchange=()=>{const key=bookingImportRowKey(bookingImportRows[Number(input.dataset.importPlate)]);input.checked?bookingImportSelection.add(key):bookingImportSelection.delete(key);renderBookingImport();applyImportSelection()});
}

function printMetadataColorChoice(row){
 if(!row.filaments.length)return null;
 const available=bookingColors(null).flatMap(x=>x[1]),filaments=row.filaments.map(f=>{const matches=available.filter(x=>x.color===f.color&&(!f.type||x.type?.toUpperCase()===f.type.toUpperCase()));return {...f,...(matches.length===1?{name:matches[0].name,translucent:matches[0].translucent}:{})}}),first=filaments[0];
 const name=filaments.map(f=>f.name?.split(' / ')[0]||[f.type,f.color].filter(Boolean).join(' ')).slice(0,4).join('・')+(filaments.length>4?' ほか'+(filaments.length-4)+'色':'');
 return {name:(filaments.length===1&&first.name?first.name:name).slice(0,200),color:first.color,filaments,translucent:!!first.translucent};
}
function applyBookingImport(expected){
 let row;try{row=selectedPrintMetadata()}catch(error){$('#bookingImportStatus').textContent=error.message;return}if(!row||!row.rows.every(r=>bookingPendingFiles.includes(r.file)||bookingAttachments.some(f=>f.id===r.attachmentId)))return;
 const f=$('#bookingForm').elements,applied=[],held=[];
 if(!expected&&row.rows.length>1&&!row.seconds)f.namedItem('printDuration').value='';
 if(row.seconds){if(!expected||f.namedItem('printDuration').value===expected.duration){setPrintDuration(Math.ceil(row.seconds/60));applied.push('印刷時間')}else held.push('印刷時間');}
 const choice=printMetadataColorChoice(row);if(choice){if(!expected||$('#bookingColor').value===expected.color){setBookingColorChoice(choice);applied.push('希望色')}else held.push('希望色');}
 if(row.filamentUsage){if(!expected||JSON.stringify(bookingFilamentUsageSnapshot())===expected.usage){const known=filamentUsageLabel(row.filamentUsage)||row.filamentUsage.filaments.some(f=>f.grams!==null||f.millimeters!==null),usage=expected&&!known?{...(bookingFilamentUsageSnapshot()||{grams:null,millimeters:null,filaments:[]}),plates:row.filamentUsage.plates}:row.filamentUsage;setBookingFilamentUsage(usage,{files:row.files,plate:row.plate});applied.push('消費量')}else held.push('消費量');}else if(!expected&&bookingUsageMetadata){setBookingFilamentUsage(null);applied.push('消費量は未取得');}
 if(row.layerHeight){if(!expected||f.namedItem('quality').value===expected.quality){f.namedItem('quality').value=row.layerHeight>=0.24?'speed':row.layerHeight<=0.16?'fine':'standard';applied.push('仕上がり')}else held.push('仕上がり');}
 $('#bookingImportStatus').textContent=(applied.length?applied.join('・')+'を反映しました。変更もできます。':'反映できる項目がありません。')+(held.length?' 入力済みの'+held.join('・')+'は保持しました。':'');$('#bookingForm').dispatchEvent(new Event('input',{bubbles:true}));
}
function renderBookingImport(){
 $('#bookingImportPanel').hidden=!bookingImportRows.length;$('#bookingImportSingle').hidden=bookingImportRows.length!==1;$('#bookingImportPlates').hidden=bookingImportRows.length<2;$('#bookingImportPlateCount').textContent=bookingImportSelection.size+' / '+bookingImportRows.length+'件';
 let row;try{row=selectedPrintMetadata()}catch(error){$('#bookingImportStatus').textContent=error.message;$('#bookingImportApply').disabled=true;return}
 if(!row){$('#bookingImportSummary').innerHTML='<p>対象のプレートを選択してください。</p>';$('#bookingImportApply').disabled=true;return}
 const seconds=row.seconds,exact=seconds?durationLabel(Math.floor(seconds/60))+(seconds%60?Math.round(seconds%60)+'秒':''):'';
 $('#bookingImportSummary').innerHTML='<div class="import-metrics"><span>合計印刷時間<strong>'+esc(seconds?exact:'合計未確定')+'</strong><small>'+(seconds?(seconds%60?'予約は'+durationLabel(Math.ceil(seconds/60))+'（1分未満は切り上げ）':''):'時間未保存のプレートを含みます。印刷時間を手入力してください。')+'</small></span><span>推定消費量<strong>'+esc(filamentUsageLabel(row.filamentUsage)||'未取得')+'</strong><small>'+esc(row.missingUsage?'消費量未取得のプレートを含みます。一部の量は合計にしません。':'印刷完了時に実際の使用量を確認できます。')+'</small></span></div><details class="import-color-details"><summary>色・積層ピッチの詳細</summary><p>積層ピッチ：'+esc(row.layerHeight?row.layerHeight+' mm':'未取得・プレート間で異なります')+'</p><div class="import-colors">'+(row.filaments.length?row.filaments.map(f=>'<span><i style="background:'+f.color+'"></i>'+esc([f.type,f.color].filter(Boolean).join(' '))+'</span>').join(''):'カラー情報は取得できませんでした。')+'</div></details>';
 $('#bookingImportApply').disabled=false;$('#bookingImportStatus').textContent='';
}
async function inspectBookingFiles(auto=true,includeSaved=false){
 const liveIds=new Set([...bookingAttachments.map(f=>f.id),...bookingPendingFiles.map(bookingPendingId),...(window.spoolBookingAwaitingFiles?.()||[])]);if(bookingUsageMetadata?.plates?.some(p=>!liveIds.has(p.attachmentId))){if(bookingUsageSource)setBookingFilamentUsage(null);else{delete bookingUsageMetadata.plates;renderBookingUsage()}}

 const files=bookingPendingFiles.filter(file=>/\.(3mf|gcode)$/i.test(file.name));if(!files.length&&!includeSaved){resetBookingImport();if(auto&&bookingPendingFiles.length){$('#bookingImportFeedback').hidden=false;$('#bookingImportFeedback').textContent='ファイルを添付しました。この形式の印刷時間・色・消費量は手動で入力してください。'}return}
 const epoch=++bookingImportEpoch,expected=bookingImportValues(),guard=window.spoolBookingDownloadContext?.();bookingReading=true;$('#bookingImportFeedback').hidden=false;$('#bookingImportFeedback').textContent='印刷情報を読み取っています…';
 const rows=[],issues=[];
 for(const file of files){try{for(const row of await extractPrintMetadata(file))rows.push({...row,file,attachmentId:bookingPendingId(file)})}catch(error){issues.push(file.name+'：'+(error.message||'読み取りに失敗しました。'))}}
 if(includeSaved)for(const attachment of bookingAttachments.filter(f=>/\.(3mf|gcode)$/i.test(f.name))){try{guard?.();let blob;if(attachment.kind==='embedded')blob=new Blob([Uint8Array.from(atob(attachment.data.split(',')[1]),c=>c.charCodeAt(0))]);else{if(!window.spoolReadBookingAttachment)throw Error('オンライン版でログインしてください。');blob=(await window.spoolReadBookingAttachment(attachment.id)).blob;}guard?.();if(epoch!==bookingImportEpoch)return;const file=new File([blob],attachment.name);for(const row of await extractPrintMetadata(file))rows.push({...row,file,attachmentId:attachment.id});}catch(error){issues.push(attachment.name+'：'+error.message)}}
 if(epoch!==bookingImportEpoch)return;bookingReading=false;
 if(!$('#bookingDialog').open||document.body.classList.contains('cloud-locked'))return;
 bookingImportRows=rows.filter(row=>bookingPendingFiles.includes(row.file)||bookingAttachments.some(f=>f.id===row.attachmentId));
 $('#bookingImportSource').innerHTML=bookingImportRows.map((row,i)=>'<option value="'+i+'">'+esc(row.file.name+(row.plate?' / プレート '+row.plate:''))+'</option>').join('');
 // Prefer a sliced plate with a saved time over unsliced project previews.
 const index=Math.max(0,bookingImportRows.findIndex(row=>row.seconds));$('#bookingImportSource').value=String(index);const remembered=bookingFilamentUsageSnapshot()?.plates||[];bookingImportSelection=new Set(bookingImportRows.filter(row=>bookingImportSelection.has(bookingImportRowKey(row))||remembered.some(p=>p.attachmentId===row.attachmentId&&p.plate===String(row.plate||''))).map(bookingImportRowKey));if(!bookingImportSelection.size&&bookingImportRows.length)bookingImportSelection.add(bookingImportRowKey(bookingImportRows[index]));renderImportPlateChoices();renderBookingImport();if(auto&&!remembered.length)applyBookingImport(expected);
 $('#bookingImportFeedback').textContent=issues.join(' / ')||'印刷情報を読み込みました。';
}
$('#bookingImportPick').onclick=()=>$('#bookingFileInput').click();
$('#bookingImportSource').onchange=()=>{const row=bookingImportRows[Number($('#bookingImportSource').value)];bookingImportSelection=new Set(row?[bookingImportRowKey(row)]:[]);renderImportPlateChoices();renderBookingImport();applyImportSelection()};
$('#bookingImportApply').onclick=()=>applyBookingImport();
const importOriginalOpenBooking=openBooking;openBooking=function(id){resetBookingImport();importOriginalOpenBooking(id);$('#bookingImportReadSaved').hidden=!bookingAttachments.some(f=>/\.(3mf|gcode)$/i.test(f.name))};
$('#bookingDialog').addEventListener('close',()=>{if(!$('#bookingDialog').open)resetBookingImport()});
$('#bookingPendingFiles').addEventListener('click',event=>{if(event.target.closest?.('[data-remove-booking-file]'))inspectBookingFiles(false)});
const importOriginalBookingSubmit=$('#bookingForm').onsubmit;$('#bookingForm').onsubmit=event=>{if(bookingReading){event.preventDefault();$('#bookingError').textContent='印刷情報の読み取りが終わるまでお待ちください。';return}try{if(bookingImportRows.length&&bookingImportSelection.size)selectedPrintMetadata();const liveIds=new Set([...bookingAttachments.map(f=>f.id),...bookingPendingFiles.map(bookingPendingId)]);if(!(window.spoolBookingAwaitingFiles?.()||[]).length&&bookingFilamentUsageSnapshot()?.plates?.some(p=>!liveIds.has(p.attachmentId)))throw Error('選択したプレートの添付がありません。印刷データを読み込み直すか、「プレートの選択を解除」してください。')}catch(error){event.preventDefault();$('#bookingError').textContent=error.message;return}return importOriginalBookingSubmit(event)};

$('#bookingImportPick').ondragover=event=>{event.preventDefault();$('#bookingImportPick').classList.add('is-drag-over')};$('#bookingImportPick').ondragleave=()=>$('#bookingImportPick').classList.remove('is-drag-over');$('#bookingImportPick').ondrop=event=>{event.preventDefault();$('#bookingImportPick').classList.remove('is-drag-over');stageBookingFiles(event.dataTransfer.files)};

$('#bookingImportAll').onclick=()=>{bookingImportSelection=new Set(bookingImportRows.map(bookingImportRowKey));renderImportPlateChoices();renderBookingImport();applyImportSelection()};
$('#bookingImportClear').onclick=()=>{bookingImportSelection.clear();renderImportPlateChoices();renderBookingImport();applyImportSelection()};
$('#bookingImportReadSaved').onclick=()=>inspectBookingFiles(false,true);

function applyImportSelection(){if(bookingImportSelection.size)applyBookingImport();else{setBookingFilamentUsage(null);$('#bookingImportStatus').textContent='自動入力の対象を解除しました。時間・希望色は手動で変更できます。';$('#bookingForm').dispatchEvent(new Event('input',{bubbles:true}))}}

window.spoolClearImportPlates=()=>{bookingImportSelection.clear();setBookingFilamentUsage(null);renderImportPlateChoices();renderBookingImport();$('#bookingForm').dispatchEvent(new Event('input',{bubbles:true}))};
