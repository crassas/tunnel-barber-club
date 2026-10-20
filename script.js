const header=document.querySelector('.site-header');
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');

window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',window.scrollY>24),{passive:true});

toggle?.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Fechar':'Menu';
});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>{
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded','false');
  if(toggle) toggle.textContent='Menu';
}));

const io=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target);}
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

const heroLogo=document.querySelector('.hero-logo');
window.addEventListener('scroll',()=>{
  if(!heroLogo) return;
  const y=Math.min(window.scrollY,700);
  heroLogo.style.transform='translateY('+(22+y*.08)+'px) scale('+(1-y/6500)+')';
  heroLogo.style.opacity=String(Math.max(.18,1-y/620));
},{passive:true});

const modal=document.getElementById('serviceModal');
const modalTitle=document.getElementById('modalTitle');
const modalPrice=document.getElementById('modalPrice');
const modalDescription=document.getElementById('modalDescription');

function openService(el){
  modalTitle.textContent=el.dataset.service||'Serviço';
  modalPrice.textContent=el.dataset.price||'';
  modalDescription.textContent=el.dataset.description||'Seleciona este serviço para marcar o teu horário.';
  modal.showModal();
}
document.querySelectorAll('[data-service]').forEach(el=>{
  el.addEventListener('click',()=>openService(el));
});
document.querySelector('.modal-close')?.addEventListener('click',()=>modal.close());
modal?.addEventListener('click',e=>{if(e.target===modal) modal.close();});
document.querySelector('.modal-cta')?.addEventListener('click',()=>modal.close());