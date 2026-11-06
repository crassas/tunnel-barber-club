import { isManager } from "./manager-access.mjs";
import { notifyAppointment } from './push.mjs';
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validDay(d){return /^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
export function validHours(rows){return Array.isArray(rows)&&rows.length===14&&new Set(rows.map(r=>`${r.weekday}-${r.segment}`)).size===14&&rows.every(r=>Number.isInteger(r.weekday)&&r.weekday>=1&&r.weekday<=7&&[1,2].includes(r.segment)&&typeof r.enabled==='boolean'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.opens)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.closes)&&r.opens<r.closes)&&rows.every(a=>!a.enabled||rows.every(b=>a===b||!b.enabled||a.weekday!==b.weekday||a.closes<=b.opens||b.closes<=a.opens));}
export async function roleFor(sql,sub){const manager=await isManager(sql,sub);const staff=await sql`SELECT id FROM barbers WHERE auth_user_id=${sub}`;return {manager,barber:staff[0]?.id||null};}
export async function calendar(req,reply,sql,user,url){
 const view=url.searchParams.get('view')||'public',b=req.body||{};
 if(req.method==='GET'&&view==='public'){
  const services=await sql`SELECT * FROM calendar_services ORDER BY price_cents,id`;
  const barbers=await sql`SELECT id,name FROM barbers ORDER BY CASE id WHEN 'rafa' THEN 1 WHEN 'bruno' THEN 2 ELSE 3 END`;
  const day=url.searchParams.get('day'),service=url.searchParams.get('service')||'combo',barber=url.searchParams.get('barber')||'';
  if(!validDay(day)||(!barbers.some(x=>x.id===barber)&&barber!==''))return reply(400,{error:'Data ou barbeiro inválido.'});
  const slots=await sql`SELECT * FROM calendar_slots(${day}::date,${service},${barber})`;
  const setup=await sql`SELECT EXISTS(SELECT 1 FROM calendar_hours h JOIN barbers b ON b.id=h.barber_id WHERE h.enabled) AND EXISTS(SELECT 1 FROM calendar_services WHERE duration_minutes IS NOT NULL) AS ready`;
  return reply(200,{services,barbers,slots,ready:setup[0].ready});
 }
 if(!user)return reply(401,{error:'Entra com Google para continuar.'});
 const role=await roleFor(sql,user.sub),internal=role.manager||!!role.barber;
 if(req.method==='GET'){
  if(view==='settings'){
   if(!role.manager)return reply(403,{error:'Acesso reservado à gestão.'});
   return reply(200,{hours:await sql`SELECT * FROM calendar_hours`,services:await sql`SELECT * FROM calendar_services ORDER BY id`});
  }
  if(view==='team'&&!internal)return reply(403,{error:'Conta da equipa por ativar.'});
  const day=url.searchParams.get('day');if(!validDay(day))return reply(400,{error:'Data inválida.'});
  const history=url.searchParams.get('history')==='1';
  const rows=await sql`SELECT a.*,b.name AS barber_name,s.name AS service_name FROM appointments a JOIN barbers b ON b.id=a.barber_id LEFT JOIN calendar_services s ON s.id=a.service_id WHERE ((${view}='team' AND (${role.manager} OR a.barber_id=${role.barber})) OR (${view}<>'team' AND a.customer_id=${user.sub})) AND (CASE WHEN ${history} THEN a.ends_at<now()-interval '30 days' ELSE a.ends_at>=now()-interval '30 days' AND a.starts_at>=${day}::date AT TIME ZONE 'Europe/Lisbon' AND a.starts_at<(${day}::date+7) AT TIME ZONE 'Europe/Lisbon' END) ORDER BY CASE WHEN ${history} THEN a.starts_at END DESC, a.starts_at LIMIT 501`;
  return reply(200,{appointments:rows.slice(0,500),truncated:rows.length>500,role});
 }
 if(b.action==='settings'){
  if(!role.manager)return reply(403,{error:'Acesso reservado à gestão.'});
  if(!['rafa','bruno','juninho'].includes(b.barber)||!validHours(b.hours)||!Array.isArray(b.services)||b.services.some(s=>!Number.isInteger(s.duration_minutes)||s.duration_minutes<5||s.duration_minutes>480))return reply(400,{error:'Confirma os horários e as durações (5 a 480 minutos).'});
  await sql.transaction([sql`SELECT pg_advisory_xact_lock(72681)`,...b.hours.map(r=>sql`INSERT INTO calendar_hours(barber_id,weekday,segment,opens,closes,enabled) VALUES(${b.barber},${r.weekday},${r.segment},${r.opens}::time,${r.closes}::time,${r.enabled}) ON CONFLICT(barber_id,weekday,segment) DO UPDATE SET opens=excluded.opens,closes=excluded.closes,enabled=excluded.enabled`),...b.services.map(s=>sql`UPDATE calendar_services SET duration_minutes=${s.duration_minutes} WHERE id=${s.id}`)]);
  return reply(200,{ok:true});
 }
 if(b.action==='cancel'||b.action==='complete'){
  if(!uuid.test(b.id||''))return reply(400,{error:'Marcação inválida.'});
  const rows=await sql`UPDATE appointments SET status=${b.action==='cancel'?'cancelled':'completed'} WHERE id=${b.id} AND status='confirmed' AND ((${internal} AND (${role.manager} OR barber_id=${role.barber})) OR (customer_id=${user.sub} AND starts_at>now() AND ${b.action}='cancel')) AND (${b.action}<>'complete' OR starts_at<=now()) RETURNING id`;
  if(rows.length&&b.action==='cancel')await notifyAppointment(sql,rows[0].id,'cancelled',user.sub);
  return reply(rows.length?200:404,rows.length?{ok:true}:{error:'Marcação indisponível.'});
 }
 if(!['book','block','walkin'].includes(b.action))return reply(400,{error:'Ação inválida.'});
 if(!uuid.test(b.requestId||'')||!['rafa','bruno','juninho'].includes(b.barber)||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(b.start||'')||isNaN(Date.parse(b.start)))return reply(400,{error:'Confirma a data e a hora.'});
 if(internal&&!role.manager&&b.barber!==role.barber)return reply(403,{error:'Só podes alterar a tua agenda.'});
 const existing=await sql`SELECT id FROM appointments WHERE created_by=${user.sub} AND request_id=${b.requestId}`;if(existing.length)return reply(200,existing[0]);
 const name=String(internal?b.name||'':user.name||'Cliente').trim().slice(0,120);if(!name)return reply(400,{error:'Indica o nome.'});
 if(b.action==='walkin'){
  if(!internal)return reply(403,{error:'Acesso reservado à equipa.'});
  const start=Date.parse(b.start);if(start<Date.now()-30*86400000||start>Date.now()+90*86400000)return reply(400,{error:'Data fora do intervalo permitido.'});
  const rows=await sql`INSERT INTO appointments(barber_id,service_id,customer_name,starts_at,ends_at,kind,created_by,request_id) SELECT ${b.barber},id,${name},${b.start}::timestamptz,${b.start}::timestamptz+make_interval(mins=>duration_minutes),'booking',${user.sub},${b.requestId} FROM calendar_services WHERE id=${b.service} AND duration_minutes IS NOT NULL RETURNING id`;
  return reply(rows.length?201:400,rows[0]||{error:'Define primeiro a duração deste serviço.'});
 }
 if(b.action==='block'){
  if(!internal)return reply(403,{error:'Acesso reservado à equipa.'});
  if(isNaN(Date.parse(b.end))||Date.parse(b.end)<=Date.parse(b.start)||Date.parse(b.end)-Date.parse(b.start)>86400000||Date.parse(b.start)<Date.now()-86400000)return reply(400,{error:'Intervalo inválido (máximo 24 horas).'});
  const rows=await sql`INSERT INTO appointments(barber_id,customer_name,starts_at,ends_at,kind,created_by,request_id) VALUES(${b.barber},${name},${b.start}::timestamptz,${b.end}::timestamptz,'block',${user.sub},${b.requestId}) RETURNING id`;return reply(201,rows[0]);
 }
 // Lock configuration while reading the authoritative duration and availability.
 const result=await sql.transaction([sql`SELECT pg_advisory_xact_lock(72681)`,sql`INSERT INTO appointments(barber_id,service_id,customer_id,customer_name,starts_at,ends_at,kind,created_by,request_id) SELECT s.barber_id,${b.service},${internal?null:user.sub},${name},s.starts_at,s.ends_at,'booking',${user.sub},${b.requestId} FROM calendar_slots((${b.start}::timestamptz AT TIME ZONE 'Europe/Lisbon')::date,${b.service},${b.barber}) s WHERE s.starts_at=${b.start}::timestamptz AND (${internal} OR (SELECT count(*) FROM appointments WHERE customer_id=${user.sub} AND status='confirmed' AND starts_at>now())<5) RETURNING id`]);
 if(result[1].length)await notifyAppointment(sql,result[1][0].id,'created',user.sub);
 return reply(result[1].length?201:409,result[1][0]||{error:'Esta hora já não está disponível. Escolhe outra.'});
}

