// File references travel with the booking JSON; model contents stay in their folders.
function validBookingFile(value){
  if(typeof value!=='string'||!value||value.length>2048||/[\x00-\x1f"<>|?*]/.test(value))return false;
  if(/^https:\/\//i.test(value)){try{const url=new URL(value);return !!url.hostname&&!url.username&&!url.password&&/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(url.pathname)}catch{return false}}
  return /^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/])/.test(value)&&!/^\\\\[?.]\\/.test(value)&&!value.slice(2).includes(':')&&/\.(stl|obj|3mf|amf|step|stp|gcode)$/i.test(value);
}
function bookingFileMarkup(booking){return (booking.files||[]).map(file=>{
  const remote=/^https:\/\//i.test(file),name=file.split(/[\\/]/).pop();
  const href=remote?file:'spool-bambu://open/?path='+encodeURIComponent(file);
  return '<a class="booking-file" href="'+esc(href)+'"'+(remote?' target="_blank" rel="noopener noreferrer"':'')+' title="'+esc(file)+'">'+(remote?'ファイルを開く／取得: ':'Bambu Studioで開く: ')+esc(name)+'</a>';
}).join('')}
const BOOKING_KEY=KEY+'-reservations';
let reservations=[],bookingEditId=null,bookingsShowing=false;
function validBookingDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;try{return new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}catch{return false}}
function validBookings(data){return Array.isArray(data)&&data.length<=2000&&new Set(data.map(x=>x?.id)).size===data.length&&data.every(x=>x&&typeof x.id==='string'&&x.id.length<=120&&typeof x.title==='string'&&x.title.trim()&&x.title.length<=100&&validBookingDate(x.registeredDate)&&validBookingDate(x.deadline)&&x.deadline>=x.registeredDate&&['月','火','水','木','金','土','日'].includes(x.weekday)&&['A2','A3','EX'].includes(x.className)&&typeof x.desiredColor==='string'&&x.desiredColor.trim()&&x.desiredColor.length<=200&&/^#[0-9a-f]{6}$/i.test(x.color)&&(x.printStatus===undefined||['印刷済み','印刷予定','未定'].includes(x.printStatus))&&Number.isInteger(x.printMinutes)&&x.printMinutes>0&&x.printMinutes<=60000&&(x.files===undefined||(Array.isArray(x.files)&&x.files.length<=10&&x.files.every(validBookingFile))))}
try{const saved=JSON.parse(storage.getItem(BOOKING_KEY)||'null')||EMBEDDED_DATA.reservations||[];if(validBookings(saved))reservations=saved}catch{}
function todayJST(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date())}
function durationLabel(minutes){const hours=Math.floor(minutes/60),rest=minutes%60;return (hours?hours+'時間':'')+(rest?rest+'分':'')||'0分'}
function displayDate(value){return value.replaceAll('-','/')}
function bookingStatus(booking){return booking.printStatus||'印刷予定'}
function bookingDue(booking,today=todayJST()){
  const days=Math.round((Date.parse(booking.deadline+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
  if(bookingStatus(booking)==='印刷済み')return {days,tone:'complete',label:'印刷済み'};
  return {days,tone:days<0?'overdue':days<=2?'soon':'normal',label:days<0?Math.abs(days)+'日超過':days===0?'本日期限':days===1?'明日期限':'あと'+days+'日'};
}
function statusMarkup(booking){const status=bookingStatus(booking),tone=status==='印刷済み'?'printed':status==='未定'?'undecided':'planned';return '<span class="print-state '+tone+'">'+(tone==='printed'?'✓ ':tone==='planned'?'● ':'— ')+status+'</span>'}
function deadlineMarkup(booking){const due=bookingDue(booking);return '<div class="booking-deadline '+due.tone+'"><time datetime="'+booking.deadline+'">'+esc(displayDate(booking.deadline))+'</time><small>'+due.label+'</small></div>'}
function resetBookingFilters(){$('#bookingSearch').value='';$('#bookingClass').value='';$('#bookingStatusFilter').value='';renderBookings()}
function renderBookings(){
  const q=$('#bookingSearch').value.trim().toLowerCase(),cls=$('#bookingClass').value,status=$('#bookingStatusFilter').value;
  const planned=reservations.filter(x=>bookingStatus(x)==='印刷予定'),completed=reservations.filter(x=>bookingStatus(x)==='印刷済み'),undecided=reservations.filter(x=>bookingStatus(x)==='未定');
  $('#bookingPlanned').textContent=planned.length;
  $('#bookingCompleted').textContent=completed.length;
  $('#bookingUrgent').textContent=reservations.filter(x=>bookingStatus(x)!=='印刷済み'&&bookingDue(x).days<=2).length;
  $('#bookingPendingTime').textContent=durationLabel(reservations.filter(x=>bookingStatus(x)!=='印刷済み').reduce((sum,x)=>sum+x.printMinutes,0));
  $('#bookingTabAll').textContent=reservations.length;$('#bookingTabPlanned').textContent=planned.length;$('#bookingTabUndecided').textContent=undecided.length;$('#bookingTabCompleted').textContent=completed.length;$('#navBookingCount').textContent=reservations.length;
  $$('[data-booking-status]').forEach(button=>{const active=button.dataset.bookingStatus===status;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))});
  const shown=reservations.filter(x=>(!cls||x.className===cls)&&(!status||bookingStatus(x)===status)&&[x.title,x.desiredColor].join(' ').toLowerCase().includes(q)).sort((a,b)=>{
    if($('#bookingSort').value==='registered')return b.registeredDate.localeCompare(a.registeredDate)||a.deadline.localeCompare(b.deadline);
    return Number(bookingStatus(a)==='印刷済み')-Number(bookingStatus(b)==='印刷済み')||a.deadline.localeCompare(b.deadline)||a.registeredDate.localeCompare(b.registeredDate);
  });
  $('#bookingCount').textContent=shown.length+' 件を表示 / 全 '+reservations.length+' 件';
  const editButton=x=>'<button class="booking-edit" data-edit-booking="'+esc(x.id)+'" aria-label="'+esc(x.title)+'の予約を編集">編集 ↗</button>';
  const colorLabel=x=>'<span class="booking-color-label"><i class="booking-color-chip" style="background:'+x.color+'"></i>'+esc(x.desiredColor)+'</span>';
  $('#bookingRows').innerHTML=shown.map(x=>'<tr class="booking-row '+(bookingStatus(x)==='印刷済み'?'is-printed':'')+'"><td class="work-cell"><strong class="work-title">'+esc(x.title)+'</strong>'+colorLabel(x)+bookingFileMarkup(x)+'</td><td><span class="class-badge">'+esc(x.className)+'</span><small class="booking-weekday">'+esc(x.weekday)+'曜日</small></td><td>'+statusMarkup(x)+'</td><td class="booking-duration">'+durationLabel(x.printMinutes)+'</td><td>'+deadlineMarkup(x)+'</td><td class="booking-registered"><time datetime="'+x.registeredDate+'">'+esc(displayDate(x.registeredDate))+'</time></td><td>'+editButton(x)+'</td></tr>').join('');
  $('#bookingCards').innerHTML=shown.map(x=>'<article class="booking-card '+bookingDue(x).tone+'"><div class="booking-card-top"><span><b class="class-badge">'+esc(x.className)+'</b><span class="booking-card-weekday">'+esc(x.weekday)+'曜日</span></span>'+statusMarkup(x)+'</div><h3>'+esc(x.title)+'</h3>'+colorLabel(x)+bookingFileMarkup(x)+'<div class="booking-card-metrics"><div><span>期限</span>'+deadlineMarkup(x)+'</div><div><span>印刷時間</span><strong>'+durationLabel(x.printMinutes)+'</strong></div></div><div class="booking-card-footer"><small>登録 '+esc(displayDate(x.registeredDate))+'</small>'+editButton(x)+'</div></article>').join('');
  $('#bookingEmpty').hidden=!!shown.length;$('#bookingEmptyTitle').textContent=reservations.length?'条件に一致する予約がありません':'最初の印刷予約を登録しましょう';$('#bookingEmptyCopy').textContent=reservations.length?'検索やクラス、印刷情報の条件を変更してください。':'作品名・希望色・期限を決めて、印刷の予定をまとめられます。';$('#emptyAddBooking').hidden=!!reservations.length;$('#resetBookingFilters').hidden=!(q||cls||status);
  $$('[data-edit-booking]').forEach(button=>button.onclick=()=>openBooking(button.dataset.editBooking));
}
function showBookingView(show){
  bookingsShowing=show;$('#bookingView').hidden=!show;
  for(const selector of ['.stats','.inventory','.footnote'])$(selector).hidden=show;
  $('#add').hidden=show;$('#openLibrary').hidden=show;$('#addBooking').hidden=!show;
  $('#showInventory').classList.toggle('selected',!show);$('#showBookings').classList.toggle('selected',show);
  $('#showInventory').setAttribute('aria-pressed',String(!show));$('#showBookings').setAttribute('aria-pressed',String(show));
  $('#navInventory').classList.toggle('active',!show);$('#navBookings').classList.toggle('active',show);
  for(const [id,active]of [['#navInventory',!show],['#navBookings',show]])active?$(id).setAttribute('aria-current','page'):$(id).removeAttribute('aria-current');
  $('.page-title h1').innerHTML=(show?'印刷予約':'フィラメント')+'<span class="heading-dot">.</span>';
  $('.page-title .eyebrow').textContent=show?'PRINT SCHEDULE':'YOUR MATERIAL LIBRARY';
  $('.page-title p').textContent=show?'作品・希望色・期限を整理して、次の印刷へ。':'素材も、色も、残量も。あなたのコレクションをひと目で。';
  $('header strong').textContent=show?'印刷予約':'フィラメント';if(show)renderBookings();
}
$('#showBookings').onclick=$('#navBookings').onclick=()=>showBookingView(true);$('#showInventory').onclick=()=>showBookingView(false);
$$('[data-nav]').forEach(button=>button.addEventListener('click',()=>showBookingView(false)));
$$('[data-booking-status]').forEach(button=>button.onclick=()=>{$('#bookingStatusFilter').value=button.dataset.bookingStatus;renderBookings()});
$('#resetBookingFilters').onclick=resetBookingFilters;
function bookingColors(current){const grouped=[];const stock=items.map(x=>({name:x.colorName+' / '+x.name+' ('+x.brand+')',color:x.color.toUpperCase()}));if(stock.length)grouped.push(['在庫の色',stock]);if(customColorPresets.length)grouped.push(['独自の色プリセット',customColorPresets.map(x=>({name:x.name,color:x.color}))]);for(const [type,colors] of Object.entries(OFFICIAL_COLOR_PRESETS)){if(type.startsWith('PLA'))grouped.push(['Bambu Lab '+type,colors.map(x=>({name:x.name+' / '+type+' (Bambu Lab)',color:x.color}))])}for(const product of ELEGOO_LIBRARY)grouped.push(['ELEGOO '+product.name,product.colors.map(x=>({name:x.name+' / '+product.name+' (ELEGOO)',color:x.color}))]);const all=grouped.flatMap(([,xs])=>xs);if(current&&!all.some(x=>x.name===current.desiredColor&&x.color===current.color))grouped.unshift(['登録済みの希望色',[{name:current.desiredColor,color:current.color}]]);return grouped}
function openBooking(id){bookingEditId=id||null;const form=$('#bookingForm');form.reset();$('#bookingError').textContent='';const current=reservations.find(x=>x.id===id),date=todayJST();form.elements.namedItem('registeredDate').value=current?.registeredDate||date;const deadline=new Date(date+'T00:00:00Z');deadline.setUTCDate(deadline.getUTCDate()+2);form.elements.namedItem('deadline').value=current?.deadline||deadline.toISOString().slice(0,10);form.elements.namedItem('deadline').min=current?.registeredDate||date;form.elements.namedItem('title').value=current?.title||'';form.elements.namedItem('files').value=(current?.files||[]).join('\n');form.elements.namedItem('weekday').value=current?.weekday||['日','月','火','水','木','金','土'][new Date(date+'T00:00:00Z').getUTCDay()];form.elements.namedItem('className').value=current?.className||'A2';form.elements.namedItem('printStatus').value=current?.printStatus||'印刷予定';form.elements.namedItem('hours').value=current?Math.floor(current.printMinutes/60):1;form.elements.namedItem('minutes').value=current?current.printMinutes%60:0;$('#bookingColor').innerHTML='<option value="">希望色を選択</option>'+bookingColors(current).map(([name,colors])=>'<optgroup label="'+esc(name)+'">'+colors.map(x=>'<option value="'+esc(JSON.stringify(x))+'">'+esc(x.name)+' '+x.color+'</option>').join('')+'</optgroup>').join('');if(current)$('#bookingColor').value=JSON.stringify({name:current.desiredColor,color:current.color});$('#deleteBooking').hidden=!current;$('#bookingDialogTitle').textContent=current?'印刷予約を編集':'印刷予約を登録';$('#bookingDialog').showModal()}
function saveBookings(next){if(!validBookings(next)){$('#bookingError').textContent='日付・作品名・希望色・印刷時間を確認してください。';return false}try{storage.setItem(BOOKING_KEY,JSON.stringify(next));reservations=next;renderBookings();if(typeof queueOfflineSave==='function')queueOfflineSave();return true}catch{toast('予約を端末に保存できません。保存容量を確認してください。');return false}}
$('#bookingForm').onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));let color;try{color=JSON.parse(data.desiredColor)}catch{$('#bookingError').textContent='希望色を一覧から選択してください。';return}const hours=Number(data.hours),minutes=Number(data.minutes);if(!Number.isInteger(hours)||hours<0||!Number.isInteger(minutes)||minutes<0||minutes>59){$('#bookingError').textContent='印刷時間を時間・分の整数で入力してください。';return}const files=String(data.files||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(files.length>10||!files.every(validBookingFile)){$('#bookingError').textContent='関連ファイルは10件まで。Windowsの絶対パス・共有フォルダーのパス・HTTPSのファイルURLを1行ずつ指定してください。対応拡張子: STL / OBJ / 3MF / AMF / STEP / STP / GCODE';return}const booking={files,id:bookingEditId||crypto.randomUUID(),registeredDate:data.registeredDate,title:data.title.trim(),weekday:data.weekday,className:data.className,printStatus:data.printStatus,desiredColor:color.name,color:color.color,printMinutes:hours*60+minutes,deadline:data.deadline};const next=bookingEditId?reservations.map(x=>x.id===bookingEditId?booking:x):[...reservations,booking];if(saveBookings(next)){$('#bookingDialog').close();toast('印刷予約を保存しました')}};
$('#bookingForm').elements.namedItem('registeredDate').onchange=()=>{$('#bookingForm').elements.namedItem('deadline').min=$('#bookingForm').elements.namedItem('registeredDate').value};
$('#deleteBooking').onclick=()=>{const booking=reservations.find(x=>x.id===bookingEditId);if(booking&&confirm('「'+booking.title+'」の印刷予約を削除しますか？')&&saveBookings(reservations.filter(x=>x.id!==bookingEditId))){$('#bookingDialog').close();toast('印刷予約を削除しました')}};
$('#addBooking').onclick=$('#emptyAddBooking').onclick=()=>openBooking();$('#closeBooking').onclick=$('#cancelBooking').onclick=()=>$('#bookingDialog').close();$('#bookingSearch').oninput=renderBookings;$('#bookingClass').onchange=$('#bookingSort').onchange=$('#bookingStatusFilter').onchange=renderBookings;
showBookingView(false);
renderBookings();
