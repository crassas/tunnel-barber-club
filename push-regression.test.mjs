import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// External authentication, database and push transports are replaced at their boundaries.
async function load(file, bindings) {
 const code=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'').replace(/export default /g,'globalThis.handler = ').replace(/export (async )?function (\w+)/g,(_,a,n)=>`globalThis.${n} = ${a||''}function ${n}`);
 const context=vm.createContext({console,URL,Buffer,process:{env:{DATABASE_URL:'test',NEON_AUTH_BASE_URL:'https://auth.example.test/auth',VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'}},...bindings});
 vm.runInContext(code,context);return context;
}
function response(){return {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
test('verified customer can configure push notifications',async()=>{
 const sql=async strings=>strings.join('').includes('SELECT b.id')?[]:[{id:'customer'}];
 const c=await load('./api/push.mjs',{neon:()=>sql,createRemoteJWKSet:()=>({}),jwtVerify:async()=>({payload:{sub:'customer'}}),isManager:async()=>false});
 const res=response();await c.handler({method:'GET',headers:{authorization:'Bearer valid'}},res);
 assert.equal(res.code,200);assert.equal(res.body.eligible,true);assert.equal(res.body.configured,true);
});
test('ineligible account cannot configure notifications',async()=>{
 const c=await load('./api/push.mjs',{neon:()=>async()=>[],createRemoteJWKSet:()=>({}),jwtVerify:async()=>({payload:{sub:'banned-or-unverified'}}),isManager:async()=>false});
 const res=response();await c.handler({method:'GET',headers:{authorization:'Bearer valid'}},res);assert.equal(res.code,403);
});
test('conversation recipient query includes its customer and excludes sender',async()=>{
 let query='',values=[];
 const c=await load('./server/push.mjs',{webpush:{sendNotification:async()=>{} }});
 await c.notifyConversation(async(strings,...v)=>{query=strings.join('?');values=v;return [];},'conversation-id','sender-id');
 assert.match(query,/c\.customer_id\s*=\s*p\.user_id/);assert.match(query,/p\.user_id\s*<>/);assert.ok(values.includes('sender-id'));
});
test('customer notification opens the exact conversation without message contents',async()=>{
 let payload;
 const c=await load('./server/push.mjs',{webpush:{sendNotification:async(_,data)=>{payload=JSON.parse(data);}}});
 await c.notifyConversation(async()=>[{endpoint:'https://web.push.apple.com/test',p256dh:'key',auth:'key',recipient_role:'customer'}],'conversation-id','barber-id');
 assert.equal(payload.url,'/conversas.html?conversation=conversation-id');assert.equal(payload.body,'Recebeste uma nova mensagem. Toca para abrir a conversa.');
});
test('push endpoint rejects missing authentication',async()=>{
 const c=await load('./api/push.mjs',{});const res=response();await c.handler({method:'GET',headers:{}},res);assert.equal(res.code,401);
});

async function client({ios=false,standalone=false,subscription=null,loggedIn=true,permission='default'}={}){
 const nodes=[],listeners={},requests=[];
 const main={prepend:node=>{nodes.push(node);}};
 const document={createElement:tag=>({tag,hidden:false,setAttribute(){},append(...children){this.children=children;}}),querySelector:()=>main,getElementById:()=>null};
 const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async()=>({endpoint:'https://web.push.apple.com/test',toJSON(){return {endpoint:this.endpoint,keys:{}};}})}};
 const auth={getSession:async()=>({data:loggedIn?{user:{id:'customer'},session:{token:'jwt'}}:{}})};
 const context=vm.createContext({document,console,Uint8Array,atob,matchMedia:()=>({matches:standalone}),Notification:{permission,requestPermission:async()=> 'granted'},PushManager:function(){},navigator:{userAgent:ios?'iPhone':'Chrome',standalone,serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},window:{tunnelPushAuth:auth,addEventListener:(name,fn)=>{listeners[name]=fn;}},fetch:async(_,options)=>{requests.push(options);return {ok:true,json:async()=>options.method==='GET'?{configured:true,publicKey:'AQID'}:{ok:true}};}});
 context.window.Notification=context.Notification;context.window.PushManager=context.PushManager;
 vm.runInContext(await fs.readFile(new URL('./dist/equipa-notifications.js',import.meta.url),'utf8'),context);
 const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};await flush();
 return {card:nodes[0],requests,context,listeners,flush};
}
test('customer can enable notifications and receives a test control',async()=>{
 const c=await client();const [,status,enable,testButton]=c.card.children;
 assert.equal(enable.hidden,false);await enable.onclick();
 assert.equal(testButton.hidden,false);assert.match(status.textContent,/ativas/);
 assert.equal(JSON.parse(c.requests.at(-1).body).action,'subscribe');
});
test('iPhone browser explains installation before requesting push permission',async()=>{
 const c=await client({ios:true});assert.match(c.card.children[1].textContent,/ecrã principal/);assert.equal(c.card.children[2].hidden,true);
});
test('existing subscription is registered again after reopening the app',async()=>{
 const subscription={endpoint:'https://web.push.apple.com/existing',toJSON(){return {endpoint:this.endpoint};}};
 const c=await client({subscription,permission:'granted'});
 assert.equal(c.card.children[3].hidden,false);
 assert.equal(JSON.parse(c.requests.at(-1).body).subscription.endpoint,'https://web.push.apple.com/existing');
});
