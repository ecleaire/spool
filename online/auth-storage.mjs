// Authentication only. Never included in inventory JSON or account/library drafts.
const browserStore=name=>{try{return globalThis[name]}catch{return null}};
export function createRememberedAuthStorage({key,session=browserStore('sessionStorage'),persistent=browserStore('localStorage')}){
 const preferenceKey=key+':remember',keys=[key,key+'-code-verifier',key+'-user'];
 let persistentUsed=false;
 const unavailable=()=>Object.assign(Error('このブラウザーではログイン情報を保存できません。サイトの保存設定を確認してください。'),{code:'AUTH_STORAGE_UNAVAILABLE'});
 const loginDefault=()=>{try{return !!persistent&&persistent.getItem(preferenceKey)!=='0'}catch{return false}};
 const remembered=()=>{try{return persistent?.getItem(preferenceKey)==='1'}catch{return false}};
 persistentUsed=remembered();
 const checkKey=k=>{if(!keys.includes(k))throw Error('認証情報の保存先が不正です。')};
 function target(){if(remembered()){persistentUsed=true;return persistent}return session}
 function probe(store){try{if(!store)throw Error();const k=key+'-storage-check';store.setItem(k,'1');if(store.getItem(k)!=='1')throw Error();store.removeItem(k)}catch{throw unavailable()}}
 function snapshot(store){return keys.map(k=>[k,store.getItem(k)])}
 function restore(store,values){for(const [k,v]of values)v===null?store.removeItem(k):store.setItem(k,v)}
 function clear(){let failed=false;const required=persistentUsed||remembered();try{if(persistent?.getItem(preferenceKey)!=='0')persistent?.removeItem(preferenceKey);for(const k of keys)persistent?.removeItem(k)}catch{failed=required}try{for(const k of keys)session?.removeItem(k)}catch{failed=true}persistentUsed=false;if(failed)throw unavailable()}
 function setRemember(value){let previousPreference=null;try{previousPreference=persistent?.getItem(preferenceKey)??null}catch{}const next=!!value,before=remembered(),source=before?persistent:session,destination=next?persistent:session;probe(destination);
  if(next===before){if(!next){try{persistent?.setItem(preferenceKey,'0');for(const k of keys)persistent?.removeItem(k)}catch{if(persistentUsed)throw unavailable()}}persistentUsed=next;return next;}
  let original,targetOriginal;
  try{original=snapshot(source);targetOriginal=snapshot(destination);restore(destination,original);if(next)persistent.setItem(preferenceKey,'1');else persistent.setItem(preferenceKey,'0');for(const k of keys)source.removeItem(k);persistentUsed=next;return next;}
  catch{try{if(original)restore(source,original);if(targetOriginal)restore(destination,targetOriginal);if(previousPreference!==null)persistent.setItem(preferenceKey,previousPreference);else persistent?.removeItem(preferenceKey)}catch{}throw unavailable()}
 }
 function matchesSession(value){try{if(!value?.access_token||!value?.user?.id)return false;const stored=JSON.parse(target()?.getItem(key)||'null');return stored?.access_token===value.access_token&&stored?.user?.id===value.user.id}catch{return false}}
 return {key,preferenceKey,remembered,loginDefault,setRemember,clear,matchesSession,assertAvailable:()=>probe(target()),
  externalClear(event){return persistentUsed&&event.storageArea===persistent&&(event.key===key||event.key===null)&&event.newValue===null},
  storage:{getItem(k){checkKey(k);try{return target()?.getItem(k)??null}catch{throw unavailable()}},setItem(k,value){checkKey(k);try{const store=target();if(!store)throw Error();store.setItem(k,value)}catch{throw unavailable()}},removeItem(k){checkKey(k);if(k===key){clear();return}try{session?.removeItem(k);persistent?.removeItem(k)}catch{if(persistentUsed)throw unavailable()}}},
 };
}
