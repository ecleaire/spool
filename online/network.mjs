import {classifyError} from './errors.mjs';
export async function retryNetwork(operation,{valid=()=>true,onRetry=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delay=600}={}){
 for(let attempt=0;attempt<2;attempt++){
  if(!valid())throw Object.assign(Error('操作の対象が変わりました。'),{code:'CANCELLED'});
  try{const result=await operation(attempt);if(result?.error)throw result.error;return result;}
  catch(error){if(attempt||classifyError(error).category!=='network'||!valid())throw error;onRetry();await wait(delay);}
 }
}
const retryableRpcs=new Set(['ensure_my_library','spool_is_admin','get_shared_filaments','get_filament_sharing','get_my_library_permissions','get_library_member_permissions','get_library_member_profiles','library_is_shared','my_filaments_shared','set_filament_sharing','stop_shared_filaments','update_library_appearance','rename_spool_library']);
export function retryingFetch(fetcher,{context=()=>null,onRetry=()=>{},timeout=12000}={}){
 return async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),method=(init.method||input.method||'GET').toUpperCase(),retryable=method==='GET'||method==='HEAD'||(method==='POST'&&retryableRpcs.has(url.pathname.split('/').pop()));
  const bounded=async()=>{const controller=new AbortController(),external=init.signal||input?.signal;let expired=false;const cancel=()=>controller.abort(external?.reason);if(external?.aborted)cancel();else external?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>{expired=true;controller.abort()},timeout);try{return await fetcher(input,{...init,signal:controller.signal})}catch(error){if(expired)throw Error('通信がタイムアウトしました。');throw error}finally{clearTimeout(timer);external?.removeEventListener('abort',cancel)}};
  if(!retryable)return url.pathname.endsWith('/rpc/save_library_state')?bounded():fetcher(input,init);
  const stamp=context();return retryNetwork(bounded,{valid:()=>context()===stamp,onRetry});
 };
}
export function sameState(a,b){
 const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
 return stable(a)===stable(b);
}
export async function saveWithRetry(api,read,library,revision,state,options){
 return retryNetwork(async attempt=>{
  if(attempt){const latest=await read(library);if(latest.error)throw latest.error;const saved=latest.data;
   if(saved.revision===revision+1&&sameState(saved.state,state))return saved.revision;
   if(saved.revision!==revision)throw Object.assign(Error('ほかの変更と重なりました。'),{code:'40001'});
  }
  return api(library,revision,state);
 },options);
}
