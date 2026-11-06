import webpush from 'web-push';
export function validateSubscription(value){
 if(!value||typeof value.endpoint!=='string'||value.endpoint.length>4096)throw Error('Subscrição inválida.');
 const url=new URL(value.endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname))throw Error('Serviço de notificações não suportado.');
 const keys=value.keys;
 if(!keys||!/^[A-Za-z0-9_-]+$/.test(keys.p256dh||'')||!/^[A-Za-z0-9_-]+$/.test(keys.auth||'')||Buffer.from(keys.p256dh,'base64url').length!==65||Buffer.from(keys.auth,'base64url').length!==16)throw Error('Subscrição inválida.');
 return {endpoint:value.endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
export async function deliverPush(sql,row,payload){
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return false;
 try{
  await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify(payload),{vapidDetails:{subject:process.env.VAPID_SUBJECT||'mailto:tunnelbarberclub@gmail.com',publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY},TTL:3600,urgency:'high',timeout:3000});
  return true;
 }catch(error){if([404,410].includes(error.statusCode))await sql`UPDATE push_subscriptions SET enabled=false,updated_at=now() WHERE id=${row.id}`;console.warn('push_delivery_failed',{status:error.statusCode||'network'});return false;}
}
export async function notifyConversation(sql,conversation,sender){
 try{
 const rows=await sql`SELECT p.*,CASE WHEN c.customer_id=p.user_id THEN 'customer' WHEN lower(u.email)='tunnelbarberclub@gmail.com' OR EXISTS(SELECT 1 FROM managers m WHERE m.auth_user_id=u.id::text) THEN 'manager' ELSE 'barber' END AS recipient_role
 FROM push_subscriptions p JOIN neon_auth."user" u ON u.id::text=p.user_id
 JOIN conversations c ON c.id=${conversation} LEFT JOIN barbers b ON b.id=c.barber_id
 WHERE p.enabled=true AND p.user_id<>${sender} AND u."emailVerified"=true AND coalesce(u.banned,false)=false
 AND (c.customer_id=p.user_id OR lower(u.email)='tunnelbarberclub@gmail.com' OR EXISTS(SELECT 1 FROM managers m WHERE m.auth_user_id=u.id::text) OR (b.auth_user_id=p.user_id AND b.active=true)) LIMIT 20`;
 await Promise.allSettled(rows.map(row=>deliverPush(sql,row,{type:'message',title:'TUNNEL · Nova mensagem',body:'Recebeste uma nova mensagem. Toca para abrir a conversa.',tag:'conversation-'+conversation,url:(row.recipient_role==='manager'?'/gestao.html':'/conversas.html')+'?conversation='+conversation})));
 }catch{console.warn('push_dispatch_failed');}
}

export async function notifyAppointment(sql,appointment,event,actor){
 if(!['created','cancelled'].includes(event))return;
 try{
  const rows=await sql`SELECT p.*,a.starts_at,s.name AS service_name,s.price_cents,b.name AS barber_name,
   CASE WHEN a.customer_id=p.user_id THEN 'customer' WHEN lower(u.email)='tunnelbarberclub@gmail.com' OR EXISTS(SELECT 1 FROM managers m WHERE m.auth_user_id=u.id::text) THEN 'manager' ELSE 'barber' END AS recipient_role
   FROM appointments a JOIN barbers b ON b.id=a.barber_id LEFT JOIN calendar_services s ON s.id=a.service_id
   JOIN push_subscriptions p ON p.enabled=true JOIN neon_auth."user" u ON u.id::text=p.user_id
   WHERE a.id=${appointment} AND a.kind='booking' AND a.status=${event==='cancelled'?'cancelled':'confirmed'}
   AND u."emailVerified"=true AND coalesce(u.banned,false)=false
   AND (p.user_id<>${actor} OR a.customer_id=p.user_id)
   AND (a.customer_id=p.user_id OR lower(u.email)='tunnelbarberclub@gmail.com' OR EXISTS(SELECT 1 FROM managers m WHERE m.auth_user_id=u.id::text) OR (b.auth_user_id=p.user_id AND b.active=true)) LIMIT 20`;
  await Promise.allSettled(rows.map(row=>{
   const start=new Date(row.starts_at);
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(start);
   const when=new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(start);
   const title=event==='cancelled'?'Marcação cancelada':row.recipient_role==='customer'?'Marcação confirmada':'Nova marcação';
   const price=Number.isSafeInteger(row.price_cents)&&row.price_cents>=0
    ?'Valor de referência: '+new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(row.price_cents/100)
    :'Valor a confirmar';
   return deliverPush(sql,row,{type:'appointment',event,title:'TUNNEL · '+title,
    body:(row.service_name||'Serviço')+' com '+(row.barber_name||'TUNNEL')+' · '+when+'. '+price+'. Toca para ver a marcação.',
    tag:'appointment-'+appointment,url:(row.recipient_role==='customer'?'/agenda.html':'/agenda-interna.html')+'?day='+day});
  }));
 }catch{console.warn('appointment_push_dispatch_failed');}
}

