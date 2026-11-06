import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet,jwtVerify } from 'jose';
import { isManager } from '../server/manager-access.mjs';
import { validateSubscription,deliverPush } from '../server/push.mjs';
let jwks;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');const reply=(s,d)=>res.status(s).json(d);
 if(!['GET','POST'].includes(req.method))return reply(405,{error:'Método não permitido.'});
 if(!process.env.DATABASE_URL||!process.env.NEON_AUTH_BASE_URL)return reply(503,{error:'Notificações indisponíveis.'});
 const token=req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply(401,{error:'Entra com Google para ativar as notificações.'});
 let user;try{const base=process.env.NEON_AUTH_BASE_URL;jwks ||= createRemoteJWKSet(new URL(base+'/.well-known/jwks.json'));user=(await jwtVerify(token,jwks,{issuer:new URL(base).origin,algorithms:['EdDSA'],requiredClaims:['sub','exp']})).payload;if(!user.sub||user.isAnonymous)throw Error();}catch{return reply(401,{error:'A sessão terminou. Entra novamente.'});}
 try{
 const sql=neon(process.env.DATABASE_URL);
 const account=await sql`SELECT id FROM neon_auth."user" WHERE id::text=${user.sub} AND "emailVerified"=true AND coalesce(banned,false)=false`;
 if(!account.length)return reply(403,{error:'Confirma a tua conta Google para ativar as notificações.'});
 const staff=await sql`SELECT b.id FROM barbers b JOIN neon_auth."user" u ON u.id::text=b.auth_user_id WHERE b.auth_user_id=${user.sub} AND b.active=true AND u."emailVerified"=true AND coalesce(u.banned,false)=false`;
 const manager=await isManager(sql,user.sub);
 const configured=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
 if(req.method==='GET')return reply(200,{eligible:true,configured,publicKey:configured?process.env.VAPID_PUBLIC_KEY:null});
 const action=req.body?.action;
 if(action==='unsubscribe'){const endpoint=req.body?.endpoint;if(typeof endpoint!=='string'||endpoint.length>4096)return reply(400,{error:'Subscrição inválida.'});await sql`UPDATE push_subscriptions SET enabled=false,updated_at=now() WHERE user_id=${user.sub} AND endpoint=${endpoint}`;return reply(200,{ok:true});}
 if(!configured)return reply(503,{error:'As notificações ainda não estão disponíveis.'});
 if(action==='subscribe'){
 let subscription;try{subscription=validateSubscription(req.body?.subscription);}catch(error){return reply(400,{error:error.message});}
 const count=await sql`SELECT count(*)::int AS n FROM push_subscriptions WHERE user_id=${user.sub} AND enabled=true AND endpoint<>${subscription.endpoint}`;if(count[0].n>=5)return reply(400,{error:'Já tens cinco dispositivos ativos. Desativa um antes de adicionar outro.'});
 await sql`INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(${user.sub},${subscription.endpoint},${subscription.keys.p256dh},${subscription.keys.auth}) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,enabled=true,updated_at=now()`;return reply(200,{ok:true});}
 if(action==='test'){
 const rows=await sql`UPDATE push_subscriptions SET last_test_at=now() WHERE user_id=${user.sub} AND endpoint=${req.body?.endpoint||''} AND enabled=true AND (last_test_at IS NULL OR last_test_at<now()-interval '1 minute') RETURNING *`;
 if(!rows.length)return reply(429,{error:'Ativa as notificações ou aguarda um minuto antes de repetir o teste.'});
 const sent=await deliverPush(sql,rows[0],{title:'TUNNEL · Notificações',body:'As notificações estão ligadas neste dispositivo.',tag:'tunnel-test',url:manager?'/gestao.html':staff.length?'/agenda-interna.html':'/conversas.html'});
 return sent?reply(200,{ok:true,accepted:true}):reply(502,{error:'O serviço não aceitou a notificação. Tenta ativar novamente.'});}
 return reply(400,{error:'Ação inválida.'});
 }catch{console.warn('push_api_failed');return reply(500,{error:'Não foi possível configurar as notificações. Tenta novamente.'});}
}

