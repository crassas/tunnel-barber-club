const CACHE='tunnel-equipa-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/equipa-offline.html')).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tunnel-equipa-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Never cache accounts, conversations, appointments, APIs or authentication.
 if(url.origin!==self.location.origin||event.request.method!=='GET'||event.request.mode!=='navigate')return;
 if(!['/agenda.html','/agenda-interna.html','/gestao.html','/conversas.html'].includes(url.pathname))return;
 event.respondWith(fetch(event.request).catch(()=>caches.match('/equipa-offline.html')));
});

self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 const appointment=payload.type==='appointment',message=payload.type==='message';
 const title=appointment?'TUNNEL · Marcação':message?'TUNNEL · Nova mensagem':'TUNNEL · Atualização';
 const body=appointment?'Tens uma atualização numa marcação.':message?'Recebeste uma nova mensagem.':'Tens uma atualização na TUNNEL.';
 event.waitUntil(self.registration.showNotification(payload.title||title,{body:payload.body||body,icon:'/pwa/icon-192.png',badge:'/pwa/icon-192.png',tag:payload.tag||(appointment?'tunnel-appointment':message?'tunnel-message':'tunnel-update'),data:{type:payload.type||'update',url:payload.url||(appointment?'/agenda.html':'/conversas.html')}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL(event.notification.data?.url||'/agenda-interna.html',self.location.origin);
 if(url.origin!==self.location.origin||!['/gestao.html','/conversas.html','/agenda-interna.html','/agenda.html'].includes(url.pathname))return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(new URL(client.url).origin===url.origin){await client.navigate(url.href);return client.focus();}}return self.clients.openWindow(url.href);}));
});
