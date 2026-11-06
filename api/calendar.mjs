import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {calendar} from '../server/calendar.mjs';
import {dayOff} from '../server/dayoff.mjs';
let jwks;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 const reply=(code,data)=>res.status(code).json(data);
 if(!['GET','POST'].includes(req.method))return reply(405,{error:'Método não permitido.'});
 if(!process.env.DATABASE_URL)return reply(503,{error:'Agenda em configuração.'});
 const url=new URL(req.url,'https://tunnelbarberclub.pt');
 const isPublic=req.method==='GET'&&(!url.searchParams.get('view')||url.searchParams.get('view')==='public');
 let user=null;
 if(!isPublic){
  const token=req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return reply(401,{error:'Entra com Google para continuar.'});
  try{
   const base=process.env.NEON_AUTH_BASE_URL;
   if(!base)throw Error('Auth missing');
   jwks ||= createRemoteJWKSet(new URL(base+'/.well-known/jwks.json'));
   const {payload}=await jwtVerify(token,jwks,{issuer:new URL(base).origin,algorithms:['EdDSA'],requiredClaims:['sub','exp']});
   if(!payload.sub||payload.isAnonymous===true)throw Error('Invalid identity');
   user=payload;
  }catch{return reply(401,{error:'A sessão terminou. Entra novamente.'});}
 }
 try{
  const sql=neon(process.env.DATABASE_URL);
  if(user){
   await sql`UPDATE public.barbers b SET auth_user_id=u.id::text FROM neon_auth."user" u
    WHERE u.id::text=${user.sub} AND u."emailVerified"=true AND coalesce(u.banned,false)=false
      AND EXISTS (SELECT 1 FROM neon_auth.account a WHERE a."userId"=u.id AND a."providerId"='google')
      AND ((b.id='rafa' AND lower(u.email)=${process.env.TUNNEL_RAFA_EMAIL?.trim().toLowerCase() || null}) OR (b.id='bruno' AND lower(u.email)=${process.env.TUNNEL_BRUNO_EMAIL?.trim().toLowerCase() || null}))
      AND b.active=true AND b.auth_user_id IS NULL`;
  }
  if(url.searchParams.get('view')==='dayoff') return await dayOff(req,reply,sql,user,url);
  let activeIds=null;
  if(isPublic){
   const rows=await sql`SELECT id FROM public.barbers WHERE active=true`;
   activeIds=new Set(rows.map(row=>row.id));
   const requested=url.searchParams.get('barber');
   if(requested&&!activeIds.has(requested))return reply(400,{error:'Barbeiro indisponível.'});
  }
  const safeReply=(code,data)=>{
   if(isPublic&&data&&Array.isArray(data.barbers)){
    data={...data,barbers:data.barbers.filter(b=>activeIds.has(b.id))};
    if(Array.isArray(data.slots))data.slots=data.slots.filter(slot=>activeIds.has(slot.barber_id));
   }
   return reply(code,data);
  };
  return await calendar(req,safeReply,sql,user,url);
 }catch(e){
  const conflict=e.code==='23P01'||e.code==='23505'||e.code==='P0001';
  return reply(conflict?409:500,{error:conflict?'Esta hora acabou de ser ocupada. Atualiza a agenda.':'Não foi possível concluir o pedido.'});
 }
}
