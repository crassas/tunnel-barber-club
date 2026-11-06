(()=>{
 const root=document.querySelector('.hero-info');if(!root)return;
 const slides=[...root.querySelectorAll('.info-face')],controls=root.querySelector('.hero-rotation-controls'),pause=root.querySelector('[data-hero-pause]');
 const names=['Rafa Soares','Bruno Hustla'];
 for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
 root.querySelectorAll('[data-barber-name]').forEach((el,i)=>el.textContent=names[i]);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let index=0,timer,playing=!reduce.matches,hover=false;
 function schedule(){clearTimeout(timer);if(playing&&!hover&&!document.hidden)timer=setTimeout(()=>show(index+1),Number(slides[index].dataset.duration));}
 function show(i){index=(i+slides.length)%slides.length;slides.forEach((s,n)=>{s.classList.toggle('is-active',n===index);s.setAttribute('aria-hidden',String(n!==index));});schedule();}
 function state(){pause.textContent=playing?'Pausar':'Retomar';pause.setAttribute('aria-label',playing?'Pausar mensagens do topo':'Retomar mensagens do topo');root.querySelector('.info-cube').setAttribute('aria-live',playing?'off':'polite');schedule();}
 controls.hidden=false;root.classList.add('rotation-ready');
 let pointerPlaying;pause.addEventListener('pointerdown',()=>{pointerPlaying=playing;});
 pause.addEventListener('click',()=>{playing=!(pointerPlaying??playing);pointerPlaying=undefined;state();});
 root.querySelector('[data-hero-prev]').addEventListener('click',()=>{playing=false;state();show(index-1);});
 root.querySelector('[data-hero-next]').addEventListener('click',()=>{playing=false;state();show(index+1);});
 root.addEventListener('focusin',()=>{playing=false;state();});
 root.addEventListener('mouseenter',()=>{hover=true;schedule();});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
 document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',()=>{if(reduce.matches){playing=false;state();}});
 show(0);state();
})();
