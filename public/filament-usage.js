// Slicer estimates are reservation information; they never deduct stock.
let bookingUsageMetadata=null,bookingUsageSource=null;
function filamentUsageLabel(value){if(!value)return '';return [value.grams!==null?value.grams.toLocaleString('ja-JP',{maximumFractionDigits:3})+' g':'',value.millimeters!==null?(value.millimeters/1000).toLocaleString('ja-JP',{maximumFractionDigits:3})+' m':''].filter(Boolean).join(' / ')}
function bookingFilamentUsageMarkup(booking){return booking.filamentUsage?'<span class="booking-usage-summary">推定消費量 '+esc(filamentUsageLabel(booking.filamentUsage)||'色別内訳あり')+'</span>':''}
function renderBookingUsage(){
 $('#bookingUsageRows').innerHTML=(bookingUsageMetadata?.filaments||[]).map(f=>'<span>'+(f.color?'<i class="booking-color-chip" style="background:'+esc(f.color)+'" aria-hidden="true"></i>':'')+'<span>'+esc([f.type,f.color].filter(Boolean).join(' ')||'色の記録なし')+'</span><strong>'+esc(filamentUsageLabel(f)||'消費量未取得')+'</strong></span>').join('');
}
function setBookingFilamentUsage(usage,source=null){bookingUsageSource=source;bookingUsageMetadata=usage&&validFilamentUsage(usage)?structuredClone(usage):null;$('#bookingFilamentGrams').value=String(bookingUsageMetadata?.grams??'');$('#bookingFilamentMeters').value=bookingUsageMetadata?.millimeters===null||!bookingUsageMetadata?'':String(Number((bookingUsageMetadata.millimeters/1000).toFixed(6)));renderBookingUsage()}
function bookingFilamentUsageSnapshot(){const grams=String($('#bookingFilamentGrams').value??'').trim(),meters=String($('#bookingFilamentMeters').value??'').trim(),filaments=bookingUsageMetadata?.filaments||[];if(!grams&&!meters&&!filaments.some(f=>f.grams!==null||f.millimeters!==null))return null;return {grams:grams?Number(grams):null,millimeters:meters?Number((Number(meters)*1000).toFixed(3)):null,filaments:structuredClone(filaments)}}
for(const id of ['#bookingFilamentGrams','#bookingFilamentMeters'])$(id).addEventListener('input',()=>{bookingUsageMetadata=null;bookingUsageSource=null;renderBookingUsage()});
const usageOriginalOpen=openBooking;openBooking=function(id){usageOriginalOpen(id);setBookingFilamentUsage(reservations.find(x=>x.id===id)?.filamentUsage||null);$('#bookingUsageDetails').open=!!bookingUsageMetadata};
const usageOriginalSubmit=$('#bookingForm').onsubmit;$('#bookingForm').onsubmit=event=>{if(!validFilamentUsage(bookingFilamentUsageSnapshot())){event.preventDefault();$('#bookingError').textContent='消費量は0以上の数値で入力してください。';$('#bookingUsageDetails').open=true;return}return usageOriginalSubmit(event)};
renderBookings();
