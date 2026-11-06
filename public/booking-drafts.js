// Device-local drafts; no credentials or file contents are stored here.
function createBookingDraftStore(target,now=()=>Date.now()){
 const prefix='spool-booking-draft-v1:',ttl=86400000;
 const scopeKey=scope=>{if(!scope||!['account','library'].every(k=>typeof scope[k]==='string'&&scope[k].length>0&&scope[k].length<=200))return null;return prefix+encodeURIComponent(scope.account)+':'+encodeURIComponent(scope.library)+':'};
 const keys=()=>{const result=[];try{if(target)for(let i=0;i<target.length;i++){const key=target.key(i);if(key?.startsWith(prefix))result.push(key)}}catch{}return result};
 function get(key){try{const value=JSON.parse(target.getItem(key));if(!value||value.version!==1||!Number.isFinite(value.updatedAt)||value.expiresAt!==value.updatedAt+ttl||now()>=value.expiresAt||typeof value.slot!=='string'||!value.data||typeof value.data!=='object'){target.removeItem(key);return null}return value}catch{try{target?.removeItem(key)}catch{}return null}}
 return {
  ttl,
  cleanup(){for(const key of keys())get(key)},
  list(scope){const base=scopeKey(scope);if(!base||!target)return [];return keys().filter(k=>k.startsWith(base)).map(get).filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt)},
  save(scope,slot,data){const base=scopeKey(scope);if(!base||!target)throw Error('この端末では下書きを保存できません。');const stamp=now(),value={version:1,slot:String(slot),updatedAt:stamp,expiresAt:stamp+ttl,data},text=JSON.stringify(value);if(text.length>160000)throw Error('下書きの容量が大きすぎます。');target.setItem(base+encodeURIComponent(slot),text);return value},
  remove(scope,slot){const base=scopeKey(scope);if(base&&target){try{target.removeItem(base+encodeURIComponent(slot));return true}catch{return false}}return false},
 };
}
