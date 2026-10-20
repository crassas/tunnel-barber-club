const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const modal=document.getElementById('serviceModal');
const title=document.getElementById('modalTitle');
const price=document.getElementById('modalPrice');
const desc=document.getElementById('modalDescription');
document.querySelectorAll('.service-card').forEach(card=>card.addEventListener('click',()=>{
  title.textContent=card.dataset.service||'';
  price.textContent=card.dataset.price||'';
  desc.textContent=card.dataset.description||'Seleciona este serviço para marcar o teu horário.';
  modal.showModal();
}));
document.querySelector('.modal-close')?.addEventListener('click',()=>modal.close());
modal?.addEventListener('click',e=>{if(e.target===modal) modal.close();});