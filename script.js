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
  description.textContent=el.dataset.description||'Seleciona este serviço para marcar o teu horário.';
  modal.showModal();
}));

document.querySelector('.modal-close')?.addEventListener('click',()=>modal.close());
document.querySelector('.modal-book')?.addEventListener('click',()=>modal.close());
modal?.addEventListener('click',e=>{if(e.target===modal) modal.close();});