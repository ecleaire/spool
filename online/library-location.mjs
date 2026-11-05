// Library IDs in links select only from the libraries returned by the server.
export function libraryFromUrl(href){try{const id=new URL(href).searchParams.get('library');return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')?id:null}catch{return null}}
export function libraryUrl(href,id){const url=new URL(href);if(id)url.searchParams.set('library',id);else url.searchParams.delete('library');return url.href}
export function loginReturnUrl(href){const url=new URL(href);url.search='';url.hash='';return url.href}

const pendingKey=href=>'spool-login-library:'+new URL(href).pathname;
export function rememberLoginLibrary(storage,href){try{const id=libraryFromUrl(href);if(id)storage.setItem(pendingKey(href),id);else storage.removeItem(pendingKey(href))}catch{}}
export function pendingLoginLibrary(storage,href){try{return libraryFromUrl(libraryUrl(href,storage.getItem(pendingKey(href))))}catch{return null}}
export function clearLoginLibrary(storage,href){try{storage.removeItem(pendingKey(href))}catch{}}
