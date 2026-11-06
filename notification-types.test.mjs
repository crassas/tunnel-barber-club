import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
async function load(file,bindings={}){
 const source=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'').replace(/export const /g,'var ').replace(/export (async )?function (\w+)/g,(_,a,n)=>`globalThis.${n}=${a||''}function ${n}`);
 const c=vm.createContext({console,URL,Buffer,Date,Intl,process:{env:{VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'}},...bindings});vm.runInContext(source,c);return c;
}
const appointment='a1111111-1111-4111-8111-111111111111';
async function calendarAction(action,{duplicate=false,conflict=false,manager=false}={}){
 const events=[];
 const sql=async(strings)=>{const q=strings.join('?');if(q.includes('SELECT id FROM barbers'))return [];if(q.includes('created_by=')&&q.includes('SELECT id'))return duplicate?[{id:appointment}]:[];if(q.includes('UPDATE appointments')||q.includes('INSERT INTO appointments'))return [{id:appointment}];return [];};
 sql.transaction=async()=>[[],conflict?[]:[{id:appointment}]];
 const c=await load('./server/calendar.mjs',{isManager:async()=>manager,notifyAppointment:async(...args)=>events.push(args.slice(1))});
 const body={action,id:appointment,requestId:'b1111111-1111-4111-8111-111111111111',barber:'rafa',service:'cabelo',start:new Date(Date.now()+86400000).toISOString(),end:new Date(Date.now()+90000000).toISOString(),name:'Teste'};
 let result;await c.calendar({method:'POST',body},(status,data)=>{result={status,data};},sql,{sub:'customer',name:'Cliente'},new URL('https://tunnel.example/api/calendar'));
 return {events,result};
}
test('new booking emits an appointment event after insertion',async()=>{
 const {events,result}=await calendarAction('book');assert.equal(result.status,201);assert.deepEqual(events,[[appointment,'created','customer']]);
});
test('idempotent booking retry does not send another notification',async()=>{
 const {events,result}=await calendarAction('book',{duplicate:true});assert.equal(result.status,200);assert.equal(events.length,0);
});
test('unavailable booking sends no notification',async()=>{
 const {events,result}=await calendarAction('book',{conflict:true});assert.equal(result.status,409);assert.equal(events.length,0);
});
test('cancellation emits a cancellation rather than a conversation event',async()=>{
 const {events,result}=await calendarAction('cancel');assert.equal(result.status,200);assert.deepEqual(events,[[appointment,'cancelled','customer']]);
});
test('completing an appointment does not announce a new booking',async()=>{
 const {events}=await calendarAction('complete',{manager:true});assert.equal(events.length,0);
});
test('blocking the calendar does not announce a customer booking',async()=>{
 const {events,result}=await calendarAction('block',{manager:true});assert.equal(result.status,201);assert.equal(events.length,0);
});
async function appointmentPush(event='created',price=1750){
 const delivered=[];let query='';
 const c=await load('./server/push.mjs',{webpush:{sendNotification:async(subscription,data)=>delivered.push({endpoint:subscription.endpoint,...JSON.parse(data)})}});
 assert.equal(typeof c.notifyAppointment,'function','appointment dispatcher exists');
 const rows=['customer','barber','manager'].map(role=>({recipient_role:role,endpoint:'https://web.push.apple.com/'+role,p256dh:'key',auth:'key',starts_at:'2026-07-01T23:30:00Z',service_name:'Cabelo',price_cents:price,barber_name:'Rafa Soares'}));
 await c.notifyAppointment(async strings=>{query=strings.join('?');return rows;},appointment,event,'customer');return {delivered,query};
}
test('customer gets confirmation while team gets a new-booking title',async()=>{
 const {delivered}=await appointmentPush();assert.equal(delivered[0].title,'TUNNEL · Marcação confirmada');assert.equal(delivered[1].title,'TUNNEL · Nova marcação');assert.equal(delivered[2].title,'TUNNEL · Nova marcação');
 for(const p of delivered){assert.equal(p.type,'appointment');assert.match(p.tag,/^appointment-/);assert.match(p.body,/02\/07\/2026/);assert.match(p.body,/00:30/);assert.match(p.body,/Cabelo/);assert.doesNotMatch(p.body,/mensagem|conversa/i);}
});
test('appointment notifications open the right agenda on the Lisbon date',async()=>{
 const {delivered,query}=await appointmentPush();assert.equal(delivered[0].url,'/agenda.html?day=2026-07-02');assert.equal(delivered[1].url,'/agenda-interna.html?day=2026-07-02');assert.equal(delivered[2].url,'/agenda-interna.html?day=2026-07-02');
 assert.match(query,/a\.customer_id\s*=\s*p\.user_id/);assert.match(query,/p\.enabled=true/);assert.match(query,/emailVerified/);
});
test('cancelled booking is explicitly labelled cancelled',async()=>{
 const {delivered}=await appointmentPush('cancelled');for(const p of delivered)assert.equal(p.title,'TUNNEL · Marcação cancelada');
});
async function worker(){
 const handlers={},notifications=[];let opened;
 const self={location:{origin:'https://tunnel.example'},addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(title,options)=>notifications.push({title,...options})},clients:{matchAll:async()=>[],openWindow:async url=>{opened=url;}}};
 const c=vm.createContext({self,URL});vm.runInContext(await fs.readFile(new URL('./dist/equipa-sw.js',import.meta.url),'utf8'),c);return {handlers,notifications,opened:()=>opened};
}
test('worker does not describe an appointment as a new message',async()=>{
 const w=await worker();let pending;w.handlers.push({data:{json:()=>({type:'appointment'})},waitUntil:p=>pending=p});await pending;assert.doesNotMatch(w.notifications[0].body,/mensagem|conversa/i);
});
test('tapping a customer appointment notification opens its agenda',async()=>{
 const w=await worker();let pending;w.handlers.notificationclick({notification:{data:{url:'/agenda.html?day=2026-07-02'},close(){}},waitUntil:p=>pending=p});await pending;assert.equal(w.opened(),'https://tunnel.example/agenda.html?day=2026-07-02');
});

test('cancellation includes the service reference price in euros',async()=>{
 const {delivered}=await appointmentPush('cancelled');for(const p of delivered)assert.match(p.body,/Valor de referência: 17,50\s*€/);
});
test('missing price is shown as unconfirmed instead of zero',async()=>{
 const {delivered}=await appointmentPush('cancelled',null);for(const p of delivered){assert.match(p.body,/Valor a confirmar/);assert.doesNotMatch(p.body,/0,00\s*€/);}
});
