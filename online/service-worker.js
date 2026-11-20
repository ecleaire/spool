// Generated public-file cache only. Never cache auth, API, config or user attachments.
const PREFIX='spool-public:'+new URL(self.registration.scope).pathname+':',CACHE=PREFIX+'__BUILD__';
const ASSETS=__ASSETS__.map(name=>new URL(name,self.registration.scope).href),PRECACHE=__PRECACHE__.map(name=>new URL(name,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='SPOOL_ACTIVATE_UPDATE'&&event.source?.url&&new URL(event.source.url).origin===self.location.origin)void self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.status>=500)throw Error('Server unavailable');return response}).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(new URL('app-offline.html',self.registration.scope).href)||Response.error()}));return;}
 if(!ASSETS.includes(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;})());
});
