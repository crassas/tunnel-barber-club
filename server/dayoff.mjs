import {isManager} from './manager-access.mjs';
const dateValid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export async function dayOff(req,reply,sql,user,url){
 const day=url.searchParams.get('day'),barber=url.searchParams.get('barber');
 if(!dateValid(day)||!['rafa','bruno'].includes(barber))return reply(400,{error:'Escolhe um dia e um barbeiro válidos.'});
 const manager=await isManager(sql,user.sub);
 const rows=await sql`SELECT id FROM barbers WHERE id=${barber} AND active=true AND auth_user_id=${user.sub}`;
 if(!manager&&!rows.length)return reply(403,{error:'Só podes gerir a tua agenda.'});
 if(req.method==='GET'){
  const [state]=await sql`SELECT EXISTS (SELECT 1 FROM calendar_days_off WHERE barber_id=${barber} AND day=${day}::date) AS is_off`;
  const hours=await sql`SELECT to_char(t,'HH24:MI') AS time FROM calendar_hours h CROSS JOIN LATERAL generate_series(${day}::date+h.opens,${day}::date+h.closes-interval '15 minutes',interval '15 minutes') t WHERE h.barber_id=${barber} AND h.weekday=extract(isodow FROM ${day}::date) AND h.enabled ORDER BY t`;
  return reply(200,{day,barber,isOff:state.is_off,hours:hours.map(x=>x.time)});
 }
 if(req.method!=='POST'||typeof req.body?.off!=='boolean')return reply(400,{error:'Pedido inválido.'});
 const range=await sql`SELECT ${day}::date >= (now() AT TIME ZONE 'Europe/Lisbon')::date AS allowed`;
 if(!range[0].allowed)return reply(400,{error:'Escolhe um dia de hoje em diante.'});
 if(req.body.off){
  await sql.transaction([sql`SELECT pg_advisory_xact_lock(72681)`,sql`INSERT INTO calendar_days_off(barber_id,day,created_by) VALUES(${barber},${day}::date,${user.sub}) ON CONFLICT(barber_id,day) DO NOTHING`]);
 }else{
  await sql.transaction([sql`SELECT pg_advisory_xact_lock(72681)`,sql`DELETE FROM calendar_days_off WHERE barber_id=${barber} AND day=${day}::date`]);
 }
 return reply(200,{ok:true,isOff:req.body.off});
}
