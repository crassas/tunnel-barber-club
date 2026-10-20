const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');

window.addEventListener('scroll',()=>{
  header?.classList.toggle('scrolled',window.scrollY>24);
  const hero=document.querySelector('.hero-content');
  if(hero && window.scrollY<900){
    const y=window.scrollY;
    hero.style.transform='translateY('+(y*.06)+'px) scale('+(1-y/7000)+')';
    hero.style.opacity=String(Math.max(.25,1-y/850));
  }
},{passive:true});

menu?.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(open));
  menu.textContent=open?'Fechar':'Menu';
});

document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded','false');
  if(menu) menu.textContent='Menu';
}));

const modal=document.getElementById('serviceModal');
const title=document.getElementById('modalTitle');
const price=document.getElementById('modalPrice');
const description=document.getElementById('modalDescription');

function openService(el){
  title.textContent=el.dataset.service||'Serviço';
  price.textContent=el.dataset.price||'';
  description.textContent=el.dataset.description||'Seleciona este serviço para marcar o teu horário.';
  modal.showModal();
}

document.querySelectorAll('[data-service]').forEach(el=>{
  el.addEventListener('click',e=>{
    if(e.target.closest('button')||el.classList.contains('service-row')) openService(el);
  });
});

document.querySelector('.modal-close')?.addEventListener('click',()=>modal.close());
modal?.addEventListener('click',e=>{if(e.target===modal) modal.close();});
document.querySelector('.modal-book')?.addEventListener('click',()=>modal.close());