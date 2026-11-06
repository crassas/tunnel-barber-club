export async function technicalAccess(method,user,sql,reply){
 if(method!=='GET')return reply(405,{error:'A pré-visualização é apenas de leitura.'});
 if(!user?.sub)return reply(401,{error:'Entra com Google para continuar.'});
 // Match the signed subject against Neon's verified identity, never an email from the request.
 const allowed=await isTechnician(sql,user.sub);
 if(!allowed)return reply(403,{error:'Esta conta não tem acesso técnico. Usa a conta Google autorizada.'});
 return reply(200,{role:'technician',mode:'preview',readOnly:true});
}

export async function isTechnician(sql,sub){
 const rows=await sql`SELECT u.id FROM neon_auth."user" u JOIN technicians t ON t.email=lower(u.email) WHERE u.id::text=${sub} AND u."emailVerified"=true AND coalesce(u.banned,false)=false AND t.enabled=true`;
 return rows.length>0;
}
