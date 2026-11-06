(()=>{
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let promptEvent;
 const box=document.createElement('section');box.setAttribute('aria-label','Aplicação TUNNEL');box.className='pwa-install';
 const text=document.createElement('p');text.textContent='Leva a tua agenda contigo. Instala a TUNNEL no telemóvel.';
 const button=document.createElement('button');button.type='button';button.className='primary';button.textContent=ios?'Como instalar no iPhone':'Instalar aplicação';
 const help=document.createElement('p');help.hidden=true;help.setAttribute('role','status');
 box.append(text,button,help);document.querySelector('main')?.prepend(box);
 const style=document.createElement('style');style.textContent='.pwa-install{padding:18px;margin:0 0 24px;border:1px solid #333;background:#111;border-radius:8px}.pwa-install p{margin:0 0 12px;line-height:1.6}.pwa-install button{width:100%}.pwa-install[hidden]{display:none}';document.head.append(style);
 const update=()=>{box.hidden=standalone();};update();
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;button.textContent='Instalar aplicação';});
 window.addEventListener('appinstalled',()=>{promptEvent=null;box.hidden=true;});
 matchMedia('(display-mode: standalone)').addEventListener('change',update);
 button.onclick=async()=>{
  if(promptEvent){const current=promptEvent;promptEvent=null;button.disabled=true;try{await current.prompt();const result=await current.userChoice;if(result.outcome==='accepted')box.hidden=true;}catch{help.hidden=false;help.textContent='Abre o menu do navegador e escolhe Instalar aplicação ou Adicionar ao ecrã principal.';}finally{button.disabled=false;}return;}
  help.hidden=false;
  help.textContent=ios?'Abre esta página no Safari. Toca em Partilhar → Adicionar ao ecrã principal → Adicionar. Se aparecer Abrir como aplicação, deixa essa opção ativa. Depois abre a TUNNEL pelo ícone e ativa as notificações. Se abriste o link no Instagram ou noutra aplicação, abre-o primeiro no Safari.':'No Chrome, abre o menu ⋮ e escolhe Instalar aplicação ou Adicionar ao ecrã principal. Se abriste este link dentro de outra aplicação, abre-o primeiro no Chrome.';
 };
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/equipa-sw.js',{scope:'/'}).catch(()=>{help.hidden=false;help.textContent='Não foi possível preparar a instalação. Confirma a ligação e volta a abrir esta página.';});
})();
