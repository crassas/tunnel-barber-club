(()=>{
 let started=false,auth,config,registration,subscription;
 const card=document.createElement('section');card.className='pwa-install';card.setAttribute('aria-label','Notificações TUNNEL');
 const title=document.createElement('h2');title.textContent='Notificações';const status=document.createElement('p');status.setAttribute('role','status');
 const enable=document.createElement('button');enable.type='button';enable.className='primary';enable.textContent='Ativar notificações';enable.hidden=true;
 const test=document.createElement('button');test.type='button';test.textContent='Enviar notificação de teste';test.hidden=true;
 const disable=document.createElement('button');disable.type='button';disable.textContent='Desativar neste dispositivo';disable.hidden=true;
 card.append(title,status,enable,test,disable);document.querySelector('main')?.prepend(card);
 async function request(action){const session=await auth.getSession();const token=session.data?.session?.token;if(!token)throw Error('Entra com Google para ativar notificações.');const response=await fetch('/api/push',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...action?{'Content-Type':'application/json'}:{}},...action?{body:JSON.stringify(action)}:{}});const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível configurar as notificações.');return result;}
 function keyBytes(key){return Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));}
 function active(){enable.hidden=true;test.hidden=false;disable.hidden=false;status.textContent='Notificações ativas neste dispositivo. Faz um teste para confirmar a receção.';}
 async function remove(){const current=subscription||await registration?.pushManager.getSubscription();if(current){try{await request({action:'unsubscribe',endpoint:current.endpoint});}finally{await current.unsubscribe();}}subscription=null;test.hidden=true;disable.hidden=true;enable.hidden=false;status.textContent='Notificações desativadas neste dispositivo.';}
 enable.onclick=async()=>{
  enable.disabled=true;
  try{const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent='As notificações não foram autorizadas. Podes alterar a permissão nas definições do navegador ou da aplicação.';return;}
   registration=await navigator.serviceWorker.ready;subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)});
   await request({action:'subscribe',subscription:subscription.toJSON()});active();
  }catch(error){status.textContent=error.message||'Não foi possível ativar. Tenta novamente.';}finally{enable.disabled=false;}
 };
 test.onclick=async()=>{test.disabled=true;try{await request({action:'test',endpoint:subscription.endpoint});status.textContent='Notificação de teste aceite pelo serviço. Confirma se apareceu no telemóvel.';}catch(error){status.textContent=error.message;}finally{test.disabled=false;}};
 disable.onclick=async()=>{disable.disabled=true;try{await remove();}catch{status.textContent='Não foi possível concluir. Confirma a ligação e tenta novamente.';}finally{disable.disabled=false;}};
 async function start(){
  if(started||!window.tunnelPushAuth)return;started=true;auth=window.tunnelPushAuth;
  try{
   const session=await auth.getSession();if(!session.data?.user){started=false;status.textContent='Entra com Google para receber avisos de mensagens e marcações.';return;}
   config=await request();if(!config.configured){status.textContent='As notificações ainda não estão disponíveis.';return;}
   const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
   if(ios&&!(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches)){status.textContent='No iPhone, adiciona a aplicação ao ecrã principal e abre pelo ícone da TUNNEL para ativar as notificações.';return;}
   if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator)){status.textContent='Este navegador não suporta notificações. Usa um navegador atualizado e, no iPhone, iOS 16.4 ou posterior.';return;}
   registration=await navigator.serviceWorker.register('/equipa-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
   subscription=await registration.pushManager.getSubscription();if(Notification.permission==='granted'&&subscription){await request({action:'subscribe',subscription:subscription.toJSON()});active();}else{status.textContent=Notification.permission==='denied'?'As notificações estão bloqueadas. Autoriza-as nas definições do dispositivo.':'Recebe avisos de mensagens e marcações, mesmo com a aplicação fechada.';enable.hidden=false;}
  }catch(error){started=false;status.textContent=error.message;}
 }
 let replay=false;document.getElementById('logout')?.addEventListener('click',async event=>{if(replay||!registration)return;event.preventDefault();event.stopImmediatePropagation();try{await remove();}catch{}replay=true;document.getElementById('logout').click();},{capture:true});
 window.addEventListener('tunnel-auth-ready',start);start();
})();
