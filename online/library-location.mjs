// Library IDs in links select only from the libraries returned by the server.
export function libraryFromUrl(href){try{const id=new URL(href).searchParams.get('library');return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')?id:null}catch{return null}}
export function libraryUrl(href,id){const url=new URL(href);if(id)url.searchParams.set('library',id);else url.searchParams.delete('library');return url.href}
export function loginReturnUrl(href){const url=new URL(href),id=libraryFromUrl(href);url.search='';url.hash='';return libraryUrl(url.href,id)}
