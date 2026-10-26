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

// The encoded film blends its end into its start; native looping never fades to black.
// Opening hours are intentionally absent until the business confirms them.
(()=>{
 const hero=document.querySelector('.hero'), video=document.querySelector('.hero-video'), toggle=document.querySelector('.film-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(!video)return;
 let paused=false, inView=true;
 const canPlay=()=>!paused&&!reduced.matches&&!document.hidden&&inView;
 const play=()=>{if(canPlay())video.play().catch(()=>{paused=true;toggle.hidden=false;toggle.textContent='Reproduzir';toggle.setAttribute('aria-label','Reproduzir animação');});};
 const sync=()=>{if(canPlay())play();else video.pause();};
 video.muted=true;video.loop=true;
 video.addEventListener('playing',()=>{hero.classList.add('film-ready');video.classList.add('is-visible');toggle.hidden=false;toggle.textContent='Pausar';toggle.setAttribute('aria-label','Pausar animação');});
 video.addEventListener('error',()=>{hero.classList.remove('film-ready');video.classList.remove('is-visible');toggle.hidden=true;});
 toggle.addEventListener('click',()=>{paused=!paused;if(paused){video.pause();toggle.textContent='Reproduzir';toggle.setAttribute('aria-label','Reproduzir animação');}else{play();}});
 document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.05}).observe(hero);
 const start=()=>{if(reduced.matches){video.pause();hero.classList.remove('film-ready');toggle.hidden=true;}else{if(!video.getAttribute('src'))video.src=video.dataset.src;sync();}};
 reduced.addEventListener('change',start);start();
})();
