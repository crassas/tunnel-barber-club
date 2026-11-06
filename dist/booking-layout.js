(()=>{
 const ui=document.querySelector('#calendar-ui');
 if(!ui)return;
 const filters=ui.querySelector('.calendar-filters');
 const grid=document.createElement('div');grid.className='booking-grid';
 const panel=(title,cls)=>{const el=document.createElement('section');el.className='booking-column '+cls;const h=document.createElement('h2');h.textContent=title;el.append(h);grid.append(el);return el};
 const services=panel('Serviço','service-column'),barbers=panel('Barbeiro','barber-column'),dates=panel('Dia e hora','date-column'),summary=panel('A tua marcação','summary-column');
 const cards=(select,target,portraits)=>{
  const list=document.createElement('div');list.className='choice-list';target.append(list);
  function render(){
   if(!select.options.length)return;
   const focusedIndex=[...list.children].indexOf(document.activeElement);list.replaceChildren();
   for(const option of select.options){
    const button=document.createElement('button');button.type='button';button.className='booking-choice';button.setAttribute('aria-pressed',String(option.selected));
    if(portraits&&option.value){const img=document.createElement('img');const photos={rafa:'rafa-soares',bruno:'bruno-hustla'};if(photos[option.value]){img.src='assets/'+photos[option.value]+'-studio.webp';img.alt='';button.append(img)}}
    const text=document.createElement('span');const parts=option.textContent.split(' · ');const name=document.createElement('strong');name.textContent=parts[0];text.append(name);if(parts[1]){const price=document.createElement('small');price.textContent=parts.slice(1).join(' · ');text.append(price)}button.append(text);
    const mark=document.createElement('span');mark.className='choice-mark';mark.textContent=option.selected?'✓':'';mark.setAttribute('aria-hidden','true');button.append(mark);
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));render();updateSummary()};list.append(button);
   }
   select.closest('label').classList.add('native-choice');if(focusedIndex>=0)list.children[focusedIndex]?.focus({preventScroll:true});
  }
  select.addEventListener('change',()=>{render();updateSummary()});new MutationObserver(()=>{render();updateSummary()}).observe(select,{childList:true});render();
 };
 for(const id of ['service','barber']){const select=document.getElementById(id);(id==='service'?services:barbers).append(select.closest('label'))}
 filters.remove();
 for(const selector of ['.calendar-head','#weekdays','.calendar-legend','#slots']){const el=ui.querySelector(selector);if(el)dates.append(el)}
 const details=document.createElement('div');details.className='booking-overview';summary.append(details);
 const booking=document.getElementById('booking-panel');summary.append(document.getElementById('internal-name'),booking);
 const chat=document.createElement('a');chat.className='booking-chat-link';chat.textContent='Conversas ↗';summary.append(chat);
 const updateSummary=()=>{
  const service=document.getElementById('service'),barber=document.getElementById('barber');details.replaceChildren();
  const pickedName=document.querySelector('.slot[aria-pressed=true] small')?.textContent;const pickedId=Object.entries({rafa:'Rafa Soares',bruno:'Bruno Hustla'}).find(([,name])=>name===pickedName)?.[0];
  for(const [label,value] of [['Serviço',service.selectedOptions[0]?.textContent],['Barbeiro',pickedName||barber.selectedOptions[0]?.textContent]]){const row=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value||'—';row.append(small,strong);details.append(row)}
  if(service.value==='combo'){const note=document.createElement('p');note.textContent='Inclui máscara facial, toalha quente e sobrancelha a cera.';details.append(note)}
  if(booking.hidden){const prompt=document.createElement('p');prompt.textContent='Seleciona uma hora disponível.';details.append(prompt)}
  chat.href='conversas.html?'+new URLSearchParams({service:service.value,barber:pickedId||barber.value});
 };
 ui.prepend(grid);cards(document.getElementById('service'),services,false);cards(document.getElementById('barber'),barbers,true);
 new MutationObserver(updateSummary).observe(booking,{attributes:true,attributeFilter:['hidden']});updateSummary();
})();
