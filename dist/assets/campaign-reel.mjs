/** One short edit, two treatments. No booking or account state is read here. */
export function createReelController({count,paint,schedule=setTimeout,cancel=clearTimeout,delay=8000,reduced=false}){
  let index=0,paused=reduced,visible=false,hidden=false,timer=null;
  const playing=()=>count>1&&!paused&&visible&&!hidden;
  const sync=()=>{
    if(timer!==null){cancel(timer);timer=null;}
    paint({index,paused,playing:playing()});
    if(playing())timer=schedule(()=>{index=(index+1)%count;sync();},delay);
  };
  sync();
  return {
    step(direction){if(count<2)return;index=(index+direction+count)%count;sync();},
    toggle(){paused=!paused;sync();},
    setVisible(value){visible=Boolean(value);sync();},
    setHidden(value){hidden=Boolean(value);sync();},
    setReduced(value){paused=Boolean(value);sync();},
    destroy(){if(timer!==null)cancel(timer);timer=null;}
  };
}

export function syncFilm(video,{active,playing,reduced,reset=false},onReady=()=>{}){
  const wantsPlayback=active&&playing&&!reduced;
  video.dataset.wantsPlayback=String(wantsPlayback);
  if(!wantsPlayback){video.pause();return;}
  if(!video.getAttribute('src')){
    video.muted=true;
    video.src=video.dataset.src;
    video.load();
  }
  if(reset&&video.readyState>0)video.currentTime=0;
  const started=video.play();
  started?.then(()=>{
    if(video.dataset.wantsPlayback==='true')onReady();
    else video.pause();
  }).catch(()=>{}); // The still image remains if autoplay or the network is unavailable.
}

if(typeof document!=='undefined'){
  const root=document.querySelector('.campaign-reel');
  if(root){
    const slides=[...root.querySelectorAll('[data-campaign-slide]')];
    const toggle=root.querySelector('[data-campaign-toggle]');
    const current=root.querySelector('[data-campaign-current]');
    const name=root.querySelector('[data-campaign-name]');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let previousIndex=-1;
    let leavingTimer=null;
    const reel=createReelController({count:slides.length,reduced:reduced.matches,paint({index,paused,playing}){
      if(index!==previousIndex){
        clearTimeout(leavingTimer);
        slides.forEach(slide=>slide.classList.remove('is-leaving'));
        if(previousIndex>=0&&!reduced.matches){
          const leaving=slides[previousIndex];
          leaving.classList.add('is-leaving');
          leavingTimer=setTimeout(()=>leaving.classList.remove('is-leaving'),1400);
        }
      }
      slides.forEach((slide,i)=>{
        const active=i===index;
        slide.classList.toggle('is-active',active);
        slide.setAttribute('aria-hidden',String(!active));
        slide.inert=!active;
        syncFilm(slide.querySelector('video'),{active,playing,reduced:reduced.matches,reset:index!==previousIndex},()=>slide.classList.add('has-motion'));
      });
      previousIndex=index;
      root.dataset.playing=String(playing);
      current.textContent=String(index+1);
      name.textContent=slides[index].dataset.name;
      toggle.textContent=paused?'Reproduzir':'Pausar';
      toggle.setAttribute('aria-pressed',String(paused));
      toggle.setAttribute('aria-label',paused?'Reproduzir sequência publicitária':'Pausar sequência publicitária');
    }});
    root.querySelector('[data-campaign-prev]').addEventListener('click',()=>reel.step(-1));
    root.querySelector('[data-campaign-next]').addEventListener('click',()=>reel.step(1));
    toggle.addEventListener('click',()=>reel.toggle());
    document.addEventListener('visibilitychange',()=>reel.setHidden(document.hidden));
    reduced.addEventListener('change',event=>reel.setReduced(event.matches));
    new IntersectionObserver(entries=>reel.setVisible(entries[0].isIntersecting),{threshold:.2}).observe(root);
    reel.setHidden(document.hidden);
  }
}
