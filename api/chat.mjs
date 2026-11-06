import { notifyConversation } from '../server/push.mjs';
import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { isManager } from '../server/manager-access.mjs';
import { management } from '../server/management.mjs';

let jwks;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (code, data) => res.status(code).json(data);
  if (!['GET', 'POST'].includes(req.method)) return reply(405, {error:'Método não permitido.'});
  if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_BASE_URL) return reply(503, {error:'O chat ainda está em configuração.'});
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply(401, {error:'Entra com Google para abrir as conversas.'});
  let user;
  try {
    const base = process.env.NEON_AUTH_BASE_URL;
    jwks ||= createRemoteJWKSet(new URL(base + '/.well-known/jwks.json'));
    const {payload} = await jwtVerify(token, jwks, {issuer:new URL(base).origin, algorithms:['EdDSA'], requiredClaims:['sub','exp']});
    if (!payload.sub || payload.isAnonymous === true) throw new Error('Missing identity');
    user = payload;
  } catch { return reply(401, {error:'A sessão terminou. Entra novamente.'}); }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const url = new URL(req.url, 'https://tunnel-barberclub.vercel.app');
    if (url.searchParams.get('view') === 'technical') return await management(req,reply,sql,user,url,true);
    if (url.searchParams.get('view') === 'management') return await management(req,reply,sql,user,url);
    const staff = await sql`SELECT id, name FROM barbers WHERE auth_user_id=${user.sub}`;
    const staffId = staff[0]?.id || null;
    const manager = await isManager(sql,user.sub);
    const id = url.searchParams.get('conversation');
    if (req.method === 'GET' && !id) {
      const conversations = await sql`SELECT c.id,c.customer_name,c.barber_id,COALESCE(b.name,'TUNNEL · Gestão') AS barber_name,c.created_at FROM conversations c LEFT JOIN barbers b ON b.id=c.barber_id WHERE c.customer_id=${user.sub} OR c.barber_id=${staffId} ORDER BY c.created_at DESC LIMIT 100`;
      return reply(200,{conversations,staff:staff[0]||null,manager});
    }
    if (req.method === 'POST' && !id) {
      if (manager) return reply(403,{error:'Abre a área de gestão para responder ao cliente na conversa dele.'});
      if (staffId) return reply(403,{error:'Seleciona uma conversa existente.'});
      const barber = req.body?.barber;
      if (!['rafa','bruno','tunnel'].includes(barber)) return reply(400,{error:'Escolhe um barbeiro.'});
      if (barber !== 'tunnel') {
        const active = await sql`SELECT id FROM barbers WHERE id=${barber} AND active=true`;
        if (!active.length) return reply(400,{error:'Este barbeiro não está disponível.'});
      }
      const name = String(user.name || 'Cliente').slice(0,120);
      const result = barber === 'tunnel'
        ? await sql`INSERT INTO conversations(customer_id,customer_name,barber_id) VALUES (${user.sub},${name},NULL) ON CONFLICT(customer_id) WHERE barber_id IS NULL DO UPDATE SET customer_name=EXCLUDED.customer_name RETURNING id`
        : await sql`INSERT INTO conversations(customer_id,customer_name,barber_id) VALUES (${user.sub},${name},${barber}) ON CONFLICT(customer_id,barber_id) DO UPDATE SET customer_name=EXCLUDED.customer_name RETURNING id`;
      return reply(200,result[0]);
    }
    if (!uuid.test(id || '')) return reply(400,{error:'Conversa inválida.'});
    const allowed = await sql`SELECT id FROM conversations WHERE id=${id} AND (customer_id=${user.sub} OR barber_id=${staffId} OR ${manager})`;
    if (!allowed.length) return reply(404,{error:'Conversa indisponível.'});
    if (req.method === 'GET') {
      const after = url.searchParams.get('after') || '0';
      if (!/^\d{1,18}$/.test(after)) return reply(400,{error:'Página inválida.'});
      const messages = await sql`SELECT m.id,m.body,m.created_at,m.sender_id=${user.sub} AS mine,
        CASE WHEN m.sender_id=c.customer_id THEN c.customer_name WHEN m.sender_id=b.auth_user_id THEN b.name ELSE 'TUNNEL · Gestão' END AS sender_name
        FROM messages m JOIN conversations c ON c.id=m.conversation_id LEFT JOIN barbers b ON b.id=c.barber_id
        WHERE m.conversation_id=${id} AND m.id>${after} ORDER BY m.id ASC LIMIT 100`;
      return reply(200,{messages});
    }
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    const clientId = req.body?.clientId;
    if (!body || body.length>2000 || !uuid.test(clientId || '')) return reply(400,{error:'Escreve uma mensagem até 2000 caracteres.'});
    const rate = await sql`SELECT count(*)::int AS n FROM messages WHERE sender_id=${user.sub} AND created_at>now()-interval '1 minute'`;
    if (rate[0].n>=20) return reply(429,{error:'Aguarda um minuto antes de enviar mais mensagens.'});
    const inserted=await sql`INSERT INTO messages(conversation_id,sender_id,body,client_id) VALUES (${id},${user.sub},${body},${clientId}) ON CONFLICT(sender_id,client_id) DO NOTHING RETURNING id`;
    if(inserted.length)await notifyConversation(sql,id,user.sub);
    return reply(200,{ok:true});
  } catch { return reply(500,{error:'Não foi possível concluir. Tenta novamente.'}); }
}
