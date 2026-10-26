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
