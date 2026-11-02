export function publicConfig(value,expectedOrigin){
 if(!value||typeof value.url!=='string'||typeof value.key!=='string')throw Error('接続設定を確認してください');
 let u;try{u=new URL(value.url)}catch{throw Error('SupabaseのHTTPSプロジェクトURLを指定してください')}
 if(u.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/i.test(u.hostname)||u.port||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('SupabaseのHTTPSプロジェクトURLを指定してください');
 if(expectedOrigin&&u.origin!==expectedOrigin)throw Error('接続先が公開設定と一致しません');
 const key=value.key;
 if(key.startsWith('sb_secret_'))throw Error('秘密キーは使用できません');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)){
  let payload;try{const raw=key.split('.')[1].replaceAll('-','+').replaceAll('_','/');payload=JSON.parse(atob(raw))}catch{throw Error('Publishableキーまたはanon公開キーを指定してください')}
  if(payload.role!=='anon'||(payload.ref&&payload.ref!==u.hostname.split('.')[0]))throw Error('Publishableキーまたはanon公開キーを指定してください');
 }
 if(key.length>4096)throw Error('公開キーの形式を確認してください');
 return {url:u.origin,key};
}

export function authStorageKey(origin){return 'spool-auth-'+new URL(origin).hostname.split('.')[0]}

export function redactDiagnostic(value){return String(value).replace(/\b(?:sb_secret_|sb_publishable_)[A-Za-z0-9_-]+/g,'[キーを非表示]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[トークンを非表示]').replace(/Bearer\s+\S+/gi,'Bearer [非表示]')}
