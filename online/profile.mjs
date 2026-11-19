export function profileOf(user){const data=user?.user_metadata||{},rawName=data.spool_display_name||data.full_name||data.name||user?.email?.split('@')[0]||'アカウント';return {name:String(rawName).trim().slice(0,50),handle:/^[a-z0-9_]{3,30}$/.test(data.spool_handle||'')?data.spool_handle:'',avatar:validAvatar(data.spool_avatar)?data.spool_avatar:''};}
export function validAvatar(value){return typeof value==='string'&&value.length<=65536&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
export function profileUpdate(name,handle,avatar){name=String(name).trim();handle=String(handle).trim().replace(/^@/,'').toLowerCase();if(!name||name.length>50)throw Error('表示名は1〜50文字で入力してください。');if(handle&&!/^[a-z0-9_]{3,30}$/.test(handle))throw Error('表示IDは半角英数字・アンダースコアの3〜30文字で入力してください。');if(avatar&&!validAvatar(avatar))throw Error('アイコン画像の形式を確認してください。');return {spool_display_name:name,spool_handle:handle,spool_avatar:avatar||''};}

export async function ensureUniqueProfileHandle(client,next,previous){
 if(next===previous)return;
 const {data,error}=await client.rpc('is_spool_handle_available',{requested_handle:next});
 if(error){if(['PGRST202','42883'].includes(error.code))throw Error('表示IDの重複を防ぐDB更新が必要です。管理者に確認してください。');throw Error('表示IDの使用状況を確認できませんでした。接続を確認して再試行してください。');}
 if(data!==true)throw Error(data===false?'この表示IDはすでに使われています。別のIDを入力してください。':'表示IDの重複を防ぐDB更新が必要です。管理者に確認してください。');
}
export function profileSaveError(error,changingHandle){if(error?.code==='23505'||String(error?.message).includes('SPOOL_HANDLE_TAKEN'))return 'この表示IDはすでに使われています。別のIDを入力してください。';if(changingHandle&&error?.code==='unexpected_failure')return '表示IDを保存できませんでした。他の人が先に使用した可能性があります。別のIDで再試行してください。';return error?.message||'プロフィールを保存できませんでした。';}
