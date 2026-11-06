/* Keep the next booking action in reach without selecting or submitting it. */
(()=>{
 if(document.body.dataset.internal==='true')return;
 const ui=document.getElementById('calendar-ui');
 const grid=ui?.querySelector('.booking-grid');
 if(!grid)return;
 const mobile=matchMedia('(max-width:700px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const english=typeof window!=='undefined'&&window.tunnelEnglish;
 const params=new URLSearchParams(location.search),choices={};
 const dates=grid.querySelector('.date-column'),summary=grid.querySelector('.summary-column');
 const slots=document.getElementById('slots'),days=document.getElementById('weekdays'),booking=document.getElementById('booking-panel');
 let interacted=false,initialAdvance=false,frame=0,animation;
 function reveal(section){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   const heading=section.matches('h2,h3')?section:section.querySelector('h2');
   if(!heading)return;
   heading.tabIndex=-1;heading.focus({preventScroll:true});
   const rect=section.getBoundingClientRect();
   if(mobile.matches||rect.top<16||rect.bottom>innerHeight-16)section.scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'});
   animation?.cancel();
   if(!reduced.matches&&section.animate)animation=section.animate([{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  });
 }
 function syncChoices(){
  for(const [id,choice] of Object.entries(choices)){
   const option=choice.select.selectedOptions[0];
   if(!option)continue;
   if(params.has(id)&&params.get(id)===option.value)choice.chosen=true;
   choice.picked.textContent=option.textContent;
   const collapsed=mobile.matches&&choice.chosen&&!choice.editing;
   choice.section.dataset.choiceCollapsed=String(collapsed);
   choice.edit.setAttribute('aria-expanded',String(!collapsed));
  }
  if(!interacted&&!initialAdvance&&choices.service?.chosen&&choices.barber?.chosen&&choices.service.select.options.length&&choices.barber.select.options.length){
   initialAdvance=true;if(mobile.matches)reveal(dates);
  }
 }
 for(const id of ['service','barber']){
  const section=grid.querySelector(id==='service'?'.service-column':'.barber-column');
  const select=document.getElementById(id),list=section.querySelector('.choice-list'),heading=section.querySelector('h2');
  list.id='booking-'+id+'-choices';
  const edit=document.createElement('button');edit.type='button';edit.className='booking-edit';edit.textContent=english?'Change':'Alterar';
  edit.setAttribute('aria-label',id==='service'?(english?'Change service':'Alterar serviço'):(english?'Change barber':'Alterar barbeiro'));edit.setAttribute('aria-controls',list.id);
  const picked=document.createElement('p');picked.className='booking-picked';
  const header=document.createElement('div');header.className='booking-step-heading';header.append(heading,edit);section.prepend(header);header.after(picked);
  const choice=choices[id]={section,select,edit,picked,chosen:false,editing:false};
  edit.onclick=()=>{interacted=true;choice.editing=true;syncChoices();reveal(section);};
  select.addEventListener('change',()=>{
   interacted=true;choice.chosen=true;choice.editing=false;syncChoices();
   reveal(id==='service'&&!choices.barber.chosen?choices.barber.section:dates);
  });
  new MutationObserver(syncChoices).observe(select,{childList:true});
 }
 const hours=document.createElement('div');hours.className='booking-hours-heading';
 const hoursTitle=document.createElement('h3');hoursTitle.id='booking-hours-title';hoursTitle.textContent=english?'Available times':'Horas disponíveis';
 const dateLabel=document.createElement('p');hours.append(hoursTitle,dateLabel);slots.before(hours);
 slots.setAttribute('aria-labelledby',hoursTitle.id);
 function syncDate(){dateLabel.textContent=days.querySelector('.day[aria-pressed=true]')?.getAttribute('aria-label')||'';}
 new MutationObserver(syncDate).observe(days,{childList:true});syncDate();
 days.addEventListener('click',event=>{
  const day=event.target.closest('.day');if(!day||day.disabled)return;
  interacted=true;syncDate();reveal(hoursTitle);
 });
 slots.addEventListener('click',event=>{
  const slot=event.target.closest('.slot');if(!slot||slot.disabled||booking.hidden)return;
  interacted=true;reveal(summary);
 });
 mobile.addEventListener('change',syncChoices);syncChoices();
})();
