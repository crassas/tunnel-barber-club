import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {technicalAccess} from '../server/technical.mjs';
let jwks;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');const reply=(code,data)=>res.status(code).json(data);
 if(req.method!=='GET')return reply(405,{error:'A pré-visualização é apenas de leitura.'});
 if(!process.env.DATABASE_URL||!process.env.NEON_AUTH_BASE_URL)return reply(503,{error:'Acesso técnico em configuração.'});
 const token=req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply(401,{error:'Entra com Google para continuar.'});
 let user;try{const base=process.env.NEON_AUTH_BASE_URL;jwks ||= createRemoteJWKSet(new URL(base+'/.well-known/jwks.json'));const result=await jwtVerify(token,jwks,{issuer:new URL(base).origin,algorithms:['EdDSA'],requiredClaims:['sub','exp']});user=result.payload;if(!user.sub||user.isAnonymous===true)throw Error();}catch{return reply(401,{error:'A sessão terminou. Entra novamente.'});}
 try{return await technicalAccess(req.method,user,neon(process.env.DATABASE_URL),reply);}catch{return reply(500,{error:'Não foi possível verificar o acesso técnico. Tenta novamente.'});}
}
