/* TUNNEL staff: no private API/data caching, no offline authentication. */
const CACHE='tunnel-staff-shell-v1';
const ASSETS=['./','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tunnel-staff-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const u=new URL(e.request.url);
 if(!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(u.pathname.includes('/api/')||u.pathname.includes('/auth/'))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./')));return;}
 if(ASSETS.some(a=>new URL(a,self.registration.scope).pathname===u.pathname))
   e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});
