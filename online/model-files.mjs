export function createOnlineModelFiles({context}){
 const current=c=>{const next=context();if(next.epoch!==c.epoch||next.library!==c.library||!next.session)throw Error('表示先またはログイン状態が変わりました。開き直してください。')};
 async function signed(id){const c=context();if(!c.session||!c.library)throw Error('ログインして添付を取得してください。');const meta=await c.client.from('library_files').select('*').eq('id',id).eq('library_id',c.library).single();if(meta.error)throw meta.error;current(c);const result=await c.client.storage.from('spool-models').createSignedUrl(meta.data.object_path,90,{download:meta.data.name});if(result.error)throw result.error;current(c);return {name:meta.data.name,url:result.data.signedUrl}}
 return {
  async download(id){const file=await signed(id),link=document.createElement('a');link.href=file.url;link.rel='noopener noreferrer';link.click()},
  async open(id){window.spoolShowModelOpen(await signed(id))},
 };
}
