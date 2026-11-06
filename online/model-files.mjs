export function createOnlineModelFiles({context}){
 const current=c=>{const next=context();if(next.epoch!==c.epoch||next.library!==c.library||!next.session)throw Error('表示先またはログイン状態が変わりました。開き直してください。')};
 async function metadata(c,id){if(!c.session||!c.library)throw Error('ログインして添付を取得してください。');const meta=await c.client.from('library_files').select('*').eq('id',id).eq('library_id',c.resolveFileLibrary?.(id)||c.library).single();if(meta.error)throw meta.error;current(c);return meta.data;}
 async function signed(id){const c=context(),meta=await metadata(c,id);const result=await c.client.storage.from('spool-models').createSignedUrl(meta.object_path,90,{download:meta.name});if(result.error)throw result.error;current(c);return {name:meta.name,url:result.data.signedUrl}}
 return {
  async download(id){const c=context(),meta=await metadata(c,id),result=await c.client.storage.from('spool-models').download(meta.object_path);if(result.error)throw result.error;current(c);const url=URL.createObjectURL(result.data),link=document.createElement('a');try{link.hidden=true;link.href=url;link.download=meta.name;link.rel='noopener noreferrer';document.body.append(link);link.click();}finally{setTimeout(()=>{link.remove();URL.revokeObjectURL(url)},60000)}},
  async open(id){window.spoolShowModelOpen(await signed(id))},
 };
}
