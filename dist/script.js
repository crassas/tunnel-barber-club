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
  // Hero geometry stays stable from first paint; only its messages fade.
  inView('.signature, .price-row, .return-offer',element=>{
    animate(element,{opacity:[.35,1],y:[12,0]},{duration:.45,ease:'easeOut'});
  },{amount:.15});
  document.querySelectorAll('.action,.offer-button,.base-book,.price-row').forEach(element=>{
    element.addEventListener('pointerdown',()=>animate(element,{scale:.985},{duration:.12}));
    ['pointerup','pointercancel','pointerleave','blur'].forEach(event=>element.addEventListener(event,()=>animate(element,{scale:1},{duration:.2,ease:'easeOut'})));
  });
}

// Independent media elements preserve their poster/frame across viewport changes.
(()=>{
 const hero=document.querySelector('.hero');
 const desktop=document.querySelector('.hero-video-desktop'),phone=document.querySelector('.hero-video-mobile');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:1100px)');
 let visible=true;
 const sync=()=>{
  const active=mobile.matches?phone:desktop;
  [desktop,phone].forEach(video=>{
   video.muted=true;
   if(video!==active||reduced.matches||document.hidden||!visible)video.pause();
   else video.play().catch(()=>{});
  });
 };
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',sync);mobile.addEventListener('change',sync);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05}).observe(hero);
 sync();
})();

// Keep the selected service and barber when opening the shared calendar.
const serviceIds={'Cabelo + Barba':'combo','Cabelo':'cabelo','Barba':'barba','Fresh Up':'fresh','Corte Júnior/Sénior':'junior','Corte Júnior / Sénior':'junior','Corte + Madeixas':'madeixas','Corte + Platinado':'platinado'};
const barberIds={'Rafa Soares':'rafa','Bruno Hustla':'bruno'};
document.querySelectorAll('input[name="barber"]').forEach(input=>input.addEventListener('change',()=>{
 document.querySelector('.modal-book').href='agenda.html?'+new URLSearchParams({service:serviceIds[title.textContent]||'combo',barber:barberIds[input.value]||''});
 document.querySelector('.booking-next').hidden=false;
}));
// An opening announcement should not remain a future promise after the date.
if(new Date()>=new Date('2026-11-02T00:00:00Z'))document.querySelector('.opening-note').hidden=true;

// Small, one-off movements guide attention without competing with the hero film.
if(window.Motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const {animate,inView}=window.Motion;
 inView('.section-rule, .price-list h2, .about-brand, .location h2',element=>{
  animate(element,{opacity:[.4,1],y:[12,0]},{duration:.65,ease:'easeOut'});
 },{amount:.35});
 inView('.barber-team',element=>{
  element.querySelectorAll('li').forEach((item,index)=>animate(item,{opacity:[.3,1],x:[-12,0]},{duration:.45,delay:index*.1,ease:'easeOut'}));
 },{amount:.3});
 inView('.tunnel-interior',element=>{
  animate(element.querySelector('img'),{scale:[1.035,1]},{duration:1.6,ease:'easeOut'});
 },{amount:.25});
 document.querySelectorAll('input[name="barber"]').forEach(input=>input.addEventListener('change',()=>{
  animate(input.closest('label'),{scale:[.985,1]},{duration:.22,ease:'easeOut'});
  animate('.booking-next',{opacity:[.45,1],y:[7,0]},{duration:.3,ease:'easeOut'});
 }));
}

// Reveal the team heading once; keep it visible without JS or with reduced motion.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
 const heading = document.getElementById('team-title');
 if (heading) {
  const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) {
    heading.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'ease-out'});
    observer.disconnect();
   }
  }, {threshold:0.4});
  observer.observe(heading);
 }
}

// One-off entrances; content is visible even without JavaScript.
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;entry.target.animate([{opacity:.45,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});observer.unobserve(entry.target);}}, {threshold:.12});
 document.querySelectorAll('.portrait-card,.about-copy p,.faq-list details,.contact-box,.services-heading').forEach(node=>observer.observe(node));
}
