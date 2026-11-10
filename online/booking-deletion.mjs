// Narrow deletion API; the booking-create capability does not grant general edit rights.
export function createBookingDeletion({context,prepare,apply,refresh,fallback,stripFile}){
 let busy=false;
 const current=c=>{const next=context();if(next.epoch!==c.epoch||next.library!==c.library||!next.session)throw Object.assign(Error('表示先またはログイン状態が変わりました。'),{code:'CANCELLED'})};
 return async(id,fileId=null)=>{
  if(busy)throw Error('削除が終わるまでお待ちください。');
  let c=context();const allowed=()=>c.can('bookings_create')||c.can(fileId?'files_delete':'bookings_delete');
  if(!c.session||!c.library||!allowed())throw Error('削除する権限がありません。');busy=true;
  try{
   await prepare();current(c);c=context();if(!allowed())throw Error('削除する権限がありません。');
   const booking=c.state.reservations.find(b=>b.id===id);if(!booking)throw Error('予約が見つかりません。開き直してください。');
   if(!fileId&&!c.can('bookings_create')&&booking.attachments?.length&&!c.can('files_delete'))throw Error('添付情報を削除する権限がありません。');
   if(fileId&&!booking.attachments?.some(f=>f.id===fileId))throw Error('添付が見つかりません。開き直してください。');
   const source=booking._sharedBookingSource,revision=source?.revision??c.revision;
   const updated=fileId?stripFile(booking,fileId):null;
   const result=await c.client.rpc('delete_booking_content',{context_lib:c.library,source_lib:source?.id||c.library,booking:source?.bookingId||id,expected_revision:revision,attachment_id:fileId});current(c);
   if(result.error){
    if(result.error.code==='WRITE_RESULT_UNKNOWN')throw Object.assign(Error('削除結果を確認できませんでした。予約を再読み込みして削除済みか確認してください。'),{code:'WRITE_RESULT_UNKNOWN'});
    if(!['PGRST202','42883'].includes(result.error.code))throw result.error;
    const legacy=fileId?c.can('bookings_edit')&&c.can('files_delete')&&(!source||source.canEdit):c.can('bookings_delete')&&(!booking.attachments?.length||c.can('files_delete'))&&(!source||source.canDelete);
    if(!legacy)throw Error('予約作成アカウントによる削除にはDB更新が必要です。管理者に booking-deletion.sql の適用を依頼してください。');
    await fallback(c,booking,updated);current(c);
   }else{
    if(!Number.isInteger(result.data)||result.data!==revision+1)throw Error('削除結果を確認できませんでした。予約を再読み込みしてください。');
    apply(c,booking,updated,result.data);
   }
   try{await refresh();current(c)}catch(error){if(error.code==='CANCELLED')throw error;return {refreshFailed:true}}
   return {refreshFailed:false};
  }finally{busy=false}
 };
}
