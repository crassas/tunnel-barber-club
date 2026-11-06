import { notifyConversation } from './push.mjs';
import { isManager } from "./manager-access.mjs";
import { isTechnician } from "./technical.mjs";
export async function management(req, reply, sql, user, url, technical=false) {
  // Role assignment is server-side only. No browser can grant itself access.
  const manager = technical ? await isTechnician(sql,user.sub) : await isManager(sql,user.sub);
  if(technical&&req.method!=="GET")return reply(403,{error:"O acesso técnico às conversas é apenas de leitura."});
  if (!manager) return reply(403,{error:'Esta conta não tem acesso à gestão. Pede ao responsável para a associar.'});

  const id=url.searchParams.get('conversation');
  if(id){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply(400,{error:'Conversa inválida.'});
    if(req.method==='POST') {
      const found=await sql`SELECT id FROM conversations WHERE id=${id}`;
      if(!found.length)return reply(404,{error:'Conversa indisponível.'});
      const body=typeof req.body?.body==='string'?req.body.body.trim():'';
      const clientId=req.body?.clientId;
      if(!body||body.length>2000||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId||''))return reply(400,{error:'Escreve uma mensagem até 2000 caracteres.'});
      const rate=await sql`SELECT count(*)::int AS n FROM messages WHERE sender_id=${user.sub} AND created_at>now()-interval '1 minute'`;
      if(rate[0].n>=20)return reply(429,{error:'Aguarda um minuto antes de enviar mais mensagens.'});
      const inserted=await sql`INSERT INTO messages(conversation_id,sender_id,body,client_id) VALUES (${id},${user.sub},${body},${clientId}) ON CONFLICT(sender_id,client_id) DO NOTHING RETURNING id`;
      if(inserted.length)await notifyConversation(sql,id,user.sub);
    return reply(200,{ok:true});
    }
    const after=url.searchParams.get('after')||'0';
    if(!/^\d{1,18}$/.test(after))return reply(400,{error:'Página inválida.'});
    const conversations=await sql`SELECT c.id,c.customer_name,COALESCE(b.name,'TUNNEL · Gestão') AS barber_name FROM conversations c LEFT JOIN barbers b ON b.id=c.barber_id WHERE c.id=${id}`;
    if(!conversations.length)return reply(404,{error:'Conversa indisponível.'});
    const messages=await sql`SELECT m.id,m.body,m.created_at,CASE WHEN m.sender_id=c.customer_id THEN c.customer_name WHEN m.sender_id=b.auth_user_id THEN b.name ELSE 'TUNNEL · Gestão' END AS sender_name,m.sender_id=c.customer_id AS customer FROM messages m JOIN conversations c ON c.id=m.conversation_id LEFT JOIN barbers b ON b.id=c.barber_id WHERE m.conversation_id=${id} AND m.id>${after} ORDER BY m.id LIMIT 100`;
    return reply(200,{conversation:conversations[0],messages});
  }
  if(req.method!=='GET')return reply(400,{error:'Escolhe uma conversa para responder.'});
  const barber=url.searchParams.get('barber')||'';
  const page=url.searchParams.get('page')||'0';
  if((barber&&!['rafa','bruno','tunnel'].includes(barber))||!/^\d{1,5}$/.test(page))return reply(400,{error:'Filtro inválido.'});
  let summaries=await sql`SELECT b.id,b.name,b.auth_user_id IS NOT NULL AS active,count(c.id)::int AS conversations,count(c.id) FILTER(WHERE latest.sender_id=c.customer_id)::int AS awaiting FROM barbers b LEFT JOIN conversations c ON c.barber_id=b.id LEFT JOIN LATERAL (SELECT sender_id FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) latest ON true GROUP BY b.id,b.name,b.auth_user_id ORDER BY CASE b.id WHEN 'rafa' THEN 1 WHEN 'bruno' THEN 2 ELSE 3 END`;
  const direct=await sql`SELECT 'tunnel' AS id,'TUNNEL · Gestão' AS name,true AS active,count(c.id)::int AS conversations,count(c.id) FILTER(WHERE latest.sender_id=c.customer_id)::int AS awaiting FROM conversations c LEFT JOIN LATERAL (SELECT sender_id FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) latest ON true WHERE c.barber_id IS NULL`;
  summaries.push(...direct);
  const conversations=await sql`SELECT c.id,c.customer_name,c.barber_id,COALESCE(b.name,'TUNNEL · Gestão') AS barber_name,COALESCE(latest.created_at,c.created_at) AS updated_at,COALESCE(latest.sender_id=c.customer_id,false) AS awaiting FROM conversations c LEFT JOIN barbers b ON b.id=c.barber_id LEFT JOIN LATERAL (SELECT sender_id,created_at FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) latest ON true WHERE (${barber}='' OR c.barber_id=${barber} OR (${barber}='tunnel' AND c.barber_id IS NULL)) ORDER BY COALESCE(latest.created_at,c.created_at) DESC,c.id LIMIT 101 OFFSET ${Number(page)*100}`;
  return reply(200,{summaries,conversations:conversations.slice(0,100),hasMore:conversations.length>100,page:Number(page)});
}
