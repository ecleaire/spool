let bookingImportRows=[],bookingImportEpoch=0,bookingReading=false;
function bookingImportValues(){const f=$('#bookingForm').elements;return {duration:f.namedItem('printDuration').value,color:$('#bookingColor').value,quality:f.namedItem('quality').value,usage:JSON.stringify(bookingFilamentUsageSnapshot())}}
function resetBookingImport(){bookingImportEpoch++;bookingReading=false;bookingImportRows=[];$('#bookingImportPanel').hidden=true;$('#bookingImportFeedback').hidden=true;$('#bookingImportFeedback').textContent='';}
function selectedPrintMetadata(){return bookingImportRows[Number($('#bookingImportSource').value)]}
function printMetadataColorChoice(row){
 if(!row.filaments.length)return null;
 const available=bookingColors(null).flatMap(x=>x[1]),filaments=row.filaments.map(f=>{const matches=available.filter(x=>x.color===f.color&&(!f.type||x.type?.toUpperCase()===f.type.toUpperCase()));return {...f,...(matches.length===1?{name:matches[0].name,translucent:matches[0].translucent}:{})}}),first=filaments[0];
 const name=filaments.map(f=>f.name?.split(' / ')[0]||[f.type,f.color].filter(Boolean).join(' ')).slice(0,4).join('・')+(filaments.length>4?' ほか'+(filaments.length-4)+'色':'');
 return {name:(filaments.length===1&&first.name?first.name:name).slice(0,200),color:first.color,filaments,translucent:!!first.translucent};
}
function applyBookingImport(expected){
 const row=selectedPrintMetadata();if(!row||!bookingPendingFiles.includes(row.file))return;
 const f=$('#bookingForm').elements,applied=[],held=[];
 if(row.seconds){if(!expected||f.namedItem('printDuration').value===expected.duration){setPrintDuration(Math.ceil(row.seconds/60));applied.push('印刷時間')}else held.push('印刷時間');}
 const choice=printMetadataColorChoice(row);if(choice){if(!expected||$('#bookingColor').value===expected.color){setBookingColorChoice(choice);applied.push('希望色')}else held.push('希望色');}
 if(row.filamentUsage){if(!expected||JSON.stringify(bookingFilamentUsageSnapshot())===expected.usage){setBookingFilamentUsage(row.filamentUsage,{file:row.file,plate:row.plate});$('#bookingUsageDetails').open=true;applied.push('消費量')}else held.push('消費量');}else if(!expected&&bookingUsageMetadata){setBookingFilamentUsage(null);applied.push('消費量は未取得');}
 if(row.layerHeight){if(!expected||f.namedItem('quality').value===expected.quality){f.namedItem('quality').value=row.layerHeight>=0.24?'speed':row.layerHeight<=0.16?'fine':'standard';applied.push('仕上がり')}else held.push('仕上がり');}
 $('#bookingImportStatus').textContent=(applied.length?applied.join('・')+'を反映しました。変更もできます。':'反映できる項目がありません。')+(held.length?' 入力済みの'+held.join('・')+'は保持しました。':'');
}
function renderBookingImport(){
 const row=selectedPrintMetadata();$('#bookingImportPanel').hidden=!row;if(!row)return;
 const seconds=row.seconds,exact=seconds?durationLabel(Math.floor(seconds/60))+(seconds%60?Math.round(seconds%60)+'秒':''):'';
 $('#bookingImportSummary').innerHTML='<div class="import-metrics"><span>印刷時間<strong>'+esc(seconds?exact:'取得できませんでした')+'</strong><small>'+(seconds?'予約は'+durationLabel(Math.ceil(seconds/60))+'（1分未満は切り上げ）':'スライス前など、時間未保存のファイルです。')+'</small></span><span>積層ピッチ<strong>'+esc(row.layerHeight?row.layerHeight+' mm':'未取得')+'</strong></span><span>推定消費量<strong>'+esc(row.filamentUsage?filamentUsageLabel(row.filamentUsage)||'色別内訳あり':'未取得')+'</strong></span></div><div class="import-colors">'+(row.filaments.length?row.filaments.map(f=>'<span><i style="background:'+f.color+'"></i>'+esc([f.type,f.color].filter(Boolean).join(' '))+'</span>').join(''):'カラー情報は取得できませんでした。')+'</div>';
 $('#bookingImportApply').disabled=!row.seconds&&!row.filaments.length&&!row.layerHeight&&!row.filamentUsage;
 $('#bookingImportStatus').textContent='';
}
async function inspectBookingFiles(auto=true){
 if(bookingUsageSource&&!bookingPendingFiles.includes(bookingUsageSource.file))setBookingFilamentUsage(null);
 const files=bookingPendingFiles.filter(file=>/\.(3mf|gcode)$/i.test(file.name));if(!files.length){resetBookingImport();if(auto&&bookingPendingFiles.length){$('#bookingImportFeedback').hidden=false;$('#bookingImportFeedback').textContent='ファイルを添付しました。この形式の印刷時間・色・消費量は手動で入力してください。'}return}
 const epoch=++bookingImportEpoch,expected=bookingImportValues();bookingReading=true;$('#bookingImportFeedback').hidden=false;$('#bookingImportFeedback').textContent='印刷情報を読み取っています…';
 const rows=[],issues=[];
 for(const file of files){try{for(const row of await extractPrintMetadata(file))rows.push({...row,file})}catch(error){issues.push(file.name+'：'+(error.message||'読み取りに失敗しました。'))}}
 if(epoch!==bookingImportEpoch)return;bookingReading=false;
 if(!$('#bookingDialog').open||document.body.classList.contains('cloud-locked'))return;
 bookingImportRows=rows.filter(row=>bookingPendingFiles.includes(row.file));
 $('#bookingImportSource').innerHTML=bookingImportRows.map((row,i)=>'<option value="'+i+'">'+esc(row.file.name+(row.plate?' / プレート '+row.plate:''))+'</option>').join('');
 // Prefer a sliced plate with a saved time over unsliced project previews.
 const index=bookingImportRows.findIndex(row=>row.seconds);$('#bookingImportSource').value=String(Math.max(0,index));renderBookingImport();if(auto)applyBookingImport(expected);
 $('#bookingImportFeedback').textContent=issues.join(' / ')||'端末内で読み取りました。予約を保存するまで登録は確定しません。';
}
$('#bookingImportPick').onclick=()=>$('#bookingFileInput').click();
$('#bookingImportSource').onchange=()=>{renderBookingImport();$('#bookingImportStatus').textContent='このプレートの内容を確認し、「フォームに反映」を押してください。'};
$('#bookingImportApply').onclick=()=>applyBookingImport();
const importOriginalOpenBooking=openBooking;openBooking=function(id){resetBookingImport();importOriginalOpenBooking(id)};
$('#bookingDialog').addEventListener('close',()=>{if(!$('#bookingDialog').open)resetBookingImport()});
$('#bookingPendingFiles').addEventListener('click',event=>{if(event.target.closest?.('[data-remove-booking-file]'))inspectBookingFiles(false)});
const importOriginalBookingSubmit=$('#bookingForm').onsubmit;$('#bookingForm').onsubmit=event=>{if(bookingReading){event.preventDefault();$('#bookingError').textContent='印刷情報の読み取りが終わるまでお待ちください。';return}return importOriginalBookingSubmit(event)};

$('#bookingImportPick').ondragover=event=>{event.preventDefault();$('#bookingImportPick').classList.add('is-drag-over')};$('#bookingImportPick').ondragleave=()=>$('#bookingImportPick').classList.remove('is-drag-over');$('#bookingImportPick').ondrop=event=>{event.preventDefault();$('#bookingImportPick').classList.remove('is-drag-over');stageBookingFiles(event.dataTransfer.files)};
