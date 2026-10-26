const header=document.querySelector('.site-header');
const nav=document.querySelector('.nav');
const menu=document.querySelector('.menu-toggle');

window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',window.scrollY>20),{passive:true});

menu?.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(open));
  menu.textContent=open?'Fechar':'Menu';
});

document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>{
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded','false');
  if(menu) menu.textContent='Menu';
}));

const modal=document.getElementById('serviceModal');
const title=document.getElementById('modalTitle');
const price=document.getElementById('modalPrice');
const description=document.getElementById('modalDescription');

document.querySelectorAll('.service-click').forEach(el=>el.addEventListener('click',()=>{
  title.textContent=el.dataset.service||'Serviço';
  price.textContent=el.dataset.price||'';
  description.textContent=el.dataset.description||'';
  document.querySelectorAll('input[name="barber"]').forEach(input=>input.checked=false);
  document.querySelector('.booking-next').hidden=true;
  document.querySelector('.copy-status').textContent='';
  document.getElementById('bookingMessage').value='';
  modal.showModal();
}));

document.querySelector('.modal-close')?.addEventListener('click',()=>modal.close());
document.querySelector('.modal-book')?.addEventListener('click',()=>modal.close());
modal?.addEventListener('click',e=>{if(e.target===modal) modal.close();});
// Close the mobile navigation with Escape and restore keyboard focus.
document.addEventListener('keydown',e=>{if(e.key==='Escape' && nav?.classList.contains('open')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu';menu.focus();}});

// Motion uses local, version-pinned assets. Content stays visible if unavailable.
if(window.Motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const {animate,inView}=window.Motion;
  animate('.hero-content',{opacity:[0,1],y:[10,0]},{duration:.55,ease:'easeOut'});
  inView('.signature, .price-row, .return-offer',element=>{
    animate(element,{opacity:[.35,1],y:[12,0]},{duration:.45,ease:'easeOut'});
  },{amount:.15});
  document.querySelectorAll('.action,.offer-button,.base-book,.price-row').forEach(element=>{
    element.addEventListener('pointerdown',()=>animate(element,{scale:.985},{duration:.12}));
    ['pointerup','pointercancel','pointerleave','blur'].forEach(event=>element.addEventListener(event,()=>animate(element,{scale:1},{duration:.2,ease:'easeOut'})));
  });
}

// Continuous silent film, with a full-height portrait source on small screens.
(()=>{
 const hero=document.querySelector('.hero'),video=document.querySelector('.hero-video');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
 let inView=true;
 const sync=()=>{if(reduced.matches||document.hidden||!inView){video.pause();return;}video.play().catch(()=>{hero.classList.remove('film-ready');});};
 video.muted=true;video.loop=true;
 video.addEventListener('playing',()=>{hero.classList.add('film-ready');video.classList.add('is-visible');});
 video.addEventListener('error',()=>{hero.classList.remove('film-ready');video.classList.remove('is-visible');});
 document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.05}).observe(hero);
 const start=()=>{if(reduced.matches){video.pause();hero.classList.remove('film-ready');return;}
 const source=mobile.matches?'assets/hero-smoke-mobile.mp4':video.dataset.src;
 if(video.getAttribute('src')!==source){video.src=source;video.load();}sync();};
 reduced.addEventListener('change',start);mobile.addEventListener('change',start);start();
})();

// Carry the selected service, price and barber into a message the visitor sends.
document.querySelectorAll('input[name="barber"]').forEach(input=>input.addEventListener('change',()=>{
 const preference=input.value==='Sem preferência'?'Sem preferência de barbeiro.':`Barbeiro: ${input.value}.`;
 document.getElementById('bookingMessage').value=`Olá! Gostava de marcar ${title.textContent} (${price.textContent}). ${preference} Que horários têm disponíveis?`;
 document.querySelector('.booking-next').hidden=false;
 document.querySelector('.copy-status').textContent='';
}));
document.querySelector('.copy-booking').addEventListener('click',async()=>{
 const message=document.getElementById('bookingMessage'),status=document.querySelector('.copy-status');
 try{await navigator.clipboard.writeText(message.value);status.textContent='Pedido copiado. Abre o Instagram e cola-o na mensagem.';}
 catch{message.focus();message.select();status.textContent='Seleciona e copia o texto acima para o enviares no Instagram.';}
});
// An opening announcement should not remain a future promise after the date.
if(new Date()>=new Date('2026-11-02T00:00:00Z'))document.querySelector('.opening-note').hidden=true;
