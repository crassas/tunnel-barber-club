(()=>{
 const barbers={rafa:'Rafa Soares',bruno:'Bruno Hustla'},services={combo:'Cabelo + Barba',cabelo:'Cabelo',barba:'Barba',fresh:'Fresh Up',junior:'Corte Júnior/Sénior',madeixas:'Corte + Madeixas',platinado:'Corte + Platinado'};
 const params=new URLSearchParams(location.search),valid=(map,value)=>Object.hasOwn(map,value)?value:'';
 let barber=valid(barbers,params.get('barber')),service=valid(services,params.get('service'));
 function update(){
  if(location.pathname.endsWith('/agenda.html')){barber=valid(barbers,document.getElementById('barber')?.value)||barber;service=valid(services,document.getElementById('service')?.value)||service;}
  if(location.pathname.endsWith('/conversas.html'))barber=valid(barbers,document.querySelector('input[name=barber]:checked')?.value)||barber;
  const query=new URLSearchParams();if(service)query.set('service',service);if(barber)query.set('barber',barber);
  document.querySelectorAll('[data-chat-link]').forEach(a=>{a.href='conversas.html'+(query.size?'?'+query:'');});
  document.querySelectorAll('[data-agenda-link]').forEach(a=>{a.href='agenda.html'+(query.size?'?'+query:'');});
  const note=document.getElementById('chat-context');if(note){note.textContent=service?services[service]+(barber?' · '+barbers[barber]:''):'';note.hidden=!service;}
 }
 if(location.pathname.endsWith('/conversas.html')&&barber){const radio=document.querySelector(`input[name=barber][value="${barber}"]`);if(radio)radio.checked=true;}
 document.addEventListener('change',update);const select=document.getElementById('barber');if(select)new MutationObserver(update).observe(select,{childList:true});update();
 if(document.getElementById('serviceModal'))document.addEventListener('change',e=>{if(e.target.name!=='barber')return;const b=Object.keys(barbers).find(id=>barbers[id]===e.target.value)||'';const title=document.getElementById('modalTitle').textContent;const s=Object.keys(services).find(id=>services[id]===title.replace('Júnior / Sénior','Júnior/Sénior'))||'combo';document.querySelector('.modal-chat').href='conversas.html?'+new URLSearchParams({service:s,barber:b});});
})();
