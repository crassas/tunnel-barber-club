import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const bundle=await readFile(new URL('./dist/assets/technical-client.js',import.meta.url),'utf8');
const source=bundle.slice(bundle.indexOf('const technicalAuth='));
function setup({user=true,allowed=true,conversations=[],failure=false}={}){
 const els=new Map(),calls=[];
 const node=()=>({textContent:'',hidden:false,disabled:false,children:[],append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items}});
 const el=id=>{if(!els.has(id))els.set(id,node());return els.get(id)};
 el('technical-workspace').hidden=true;
 const auth={getSession:async()=>({data:{user:user?{id:'real-user'}:null}}),signOut:async()=>({})};
 const context=vm.createContext({URLSearchParams,Date,console,Error,String,setInterval(){},Lf:()=>auth,
  document:{getElementById:el,createElement:node,hidden:false},location:{origin:'https://tunnel.example',reload(){}},
  tunnelSessionToken:async()=>({data:{token:'verified-session'}}),
  fetch:async(url,options)=>{calls.push({url,options});if(url==='/api/technical')return{ok:allowed,json:async()=>allowed?{readOnly:true}:{error:'Sem acesso'}};
   if(failure)throw Error('Sem ligação');
   return{ok:true,json:async()=>url.includes('conversation=')?{messages:[]}:{conversations}};}
 });
 vm.runInContext(source,context);
 return{context,el,calls};
}
const flush=()=>new Promise(setImmediate);
test('signed-out visitor sees login and does not request private records',async()=>{
 const {el,calls}=setup({user:false});await flush();
 assert.equal(el('technical-workspace').hidden,true);assert.equal(el('login').hidden,false);assert.equal(calls.length,0);
});
test('unauthorized account cannot open technical conversations',async()=>{
 const {el,calls}=setup({allowed:false});await flush();
 assert.equal(el('technical-workspace').hidden,true);assert.equal(calls.length,1);assert.match(el('status').textContent,/Sem acesso/);
});
test('empty production response stays empty instead of showing sample customers',async()=>{
 const {el,calls}=setup();await flush();
 assert.equal(el('technical-workspace').hidden,false);assert.equal(el('live-threads').children.length,0);
 assert.equal(el('live-status').textContent,'Ainda não há conversas reais.');
 assert.equal(calls[1].url,'/api/chat?view=technical');assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer verified-session'));
});
test('customer list and messages come from authenticated API responses',async()=>{
 const {el,calls}=setup({conversations:[{id:'actual-thread',customer_name:'Cliente da API',barber_name:'Rafa Soares',awaiting:true}]});await flush();
 assert.equal(el('live-threads').children.length,1);assert.equal(el('live-threads').children[0].textContent,'Cliente da API · Rafa Soares · Por responder');
 el('live-threads').children[0].onclick();await flush();
 assert.ok(calls.at(-1).url.includes('conversation=actual-thread'));assert.equal(el('live-status').textContent,'Conversa aberta, ainda sem mensagens.');
});
test('network failure reports an error with no fabricated fallback',async()=>{
 const {el}=setup({failure:true});await flush();assert.equal(el('live-threads').children.length,0);assert.match(el('live-status').textContent,/Não foi possível atualizar/);
});
