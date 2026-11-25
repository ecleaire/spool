type ReadEnv = (name:string)=>string|undefined;
export class ConfigurationError extends Error {}
export function requiredSetting(name:string,read:ReadEnv=Deno.env.get){
  const value=read(name)?.trim();
  if(!value) throw new ConfigurationError('Edge Functions の設定 '+name+' が見つかりません。');
  return value;
}
export function projectKey(legacy:string,collection:string,read:ReadEnv=Deno.env.get){
  const legacyKey=read(legacy)?.trim();
  if(legacyKey)return legacyKey;
  const raw=read(collection);
  if(raw){
    try{
      const key=JSON.parse(raw)?.default;
      if(typeof key==='string' && key.trim())return key.trim();
    }catch{/* Report only the name, never log the key dictionary. */}
  }
  throw new ConfigurationError('Supabase の '+legacy+' または '+collection+' の default キーを確認してください。');
}
export function internalRequest(request:Request,url:string,auth:string){
  const headers=new Headers({Authorization:auth});
  const withBody=request.method!=='GET' && request.method!=='HEAD';
  if(withBody)for(const name of ['Content-Type','Content-Length']){
    const value=request.headers.get(name);
    if(value!==null)headers.set(name,value);
  }
  return new Request(url,{method:request.method,headers,body:withBody?request.body:null});
}

export function guestOperation(path:string,method:string){
  if(method==='POST')return /^\/api\/works\/[\w-]+\/reactions$/.test(path);
  if(method==='HEAD')return /^\/api\/files\/[\w-]+\/(real|image|model-\d+)$/.test(path);
  return method==='GET' && (
    ['/api/session','/api/works','/api/reactions','/api/event/poster'].includes(path) ||
    /^\/api\/works\/[\w-]+\/model$/.test(path) ||
    /^\/api\/files\/[\w-]+\/(real|image|model-\d+)$/.test(path)
  );
}
