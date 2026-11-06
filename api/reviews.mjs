import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
let jwks;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');const reply=(code,data)=>res.status(code).json(data);
 if(!['GET','POST'].includes(req.method))return reply(405,{error:'Método não permitido.'});
 if(!process.env.DATABASE_URL)return reply(503,{error:'Avaliações temporariamente indisponíveis.'});
 try{
 const sql=neon(process.env.DATABASE_URL);
 if(req.method==='GET'){
 const reviews=await sql`SELECT display_name,rating,body,updated_at FROM customer_reviews ORDER BY updated_at DESC LIMIT 50`;
 const [summary]=await sql`SELECT count(*)::int AS count,round(avg(rating),1) AS average FROM customer_reviews`;
 return reply(200,{reviews,summary});
 }
 const token=req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply(401,{error:'Entra com Google para avaliar.'});
 let user;try{const base=process.env.NEON_AUTH_BASE_URL;jwks ||= createRemoteJWKSet(new URL(base+'/.well-known/jwks.json'));user=(await jwtVerify(token,jwks,{issuer:new URL(base).origin,algorithms:['EdDSA'],requiredClaims:['sub','exp']})).payload;if(!user.sub||user.isAnonymous===true)throw Error();}catch{return reply(401,{error:'Entra novamente com Google.'});}
 const rating=req.body?.rating,body=typeof req.body?.body==='string'?req.body.body.trim():'';
 if(!Number.isInteger(rating)||rating<1||rating>5||body.length<10||body.length>1000||req.body?.publish!==true)return reply(400,{error:'Escolhe 1 a 5 estrelas, escreve 10 a 1000 caracteres e confirma a publicação.'});
 const identities=await sql`SELECT name FROM neon_auth."user" WHERE id::text=${user.sub} AND "emailVerified"=true AND coalesce(banned,false)=false`;
 if(!identities.length)return reply(403,{error:'É necessária uma conta Google verificada.'});
 const displayName=String(identities[0].name||'Cliente').trim().split(/\s+/)[0].slice(0,60)||'Cliente';
 const result=await sql`INSERT INTO customer_reviews(auth_user_id,display_name,rating,body) VALUES(${user.sub},${displayName},${rating},${body}) ON CONFLICT(auth_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,rating=EXCLUDED.rating,body=EXCLUDED.body,updated_at=now() WHERE customer_reviews.updated_at<now()-interval '30 seconds' RETURNING auth_user_id`;
 if(!result.length)return reply(429,{error:'Aguarda 30 segundos antes de atualizar a avaliação.'});
 return reply(200,{ok:true});
 }catch{return reply(500,{error:'Não foi possível carregar ou guardar a avaliação. Tenta novamente.'});}
}
