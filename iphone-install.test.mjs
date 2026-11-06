import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function installation({ios=true,standalone=false,nativePrompt=false}={}){
 const nodes=[],listeners={};let registered=false,prompts=0;
 const main={prepend:x=>nodes.push(x)};
 const document={createElement:()=>({hidden:false,setAttribute(){},append(...children){this.children=children;}}),querySelector:()=>main,head:{append(){}}};
 const context=vm.createContext({document,location:{pathname:'/conversas.html'},navigator:{userAgent:ios?'iPhone':'Android',standalone,serviceWorker:{register:async()=>{registered=true;}}},matchMedia:()=>({matches:standalone,addEventListener(){}}),window:{addEventListener:(n,fn)=>listeners[n]=fn}});
 vm.runInContext(await fs.readFile(new URL('./dist/equipa-pwa.js',import.meta.url),'utf8'),context);
 if(nativePrompt)listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'accepted'})});
 await new Promise(resolve=>setImmediate(resolve));
 return {card:nodes[0],registered,prompts:()=>prompts};
}
test('iPhone installation button explains the manual installation step',async()=>{
 const {card,registered}=await installation();assert.equal(card.children[1].textContent,'Como instalar no iPhone');assert.equal(registered,true);
 await card.children[1].onclick();assert.equal(card.children[2].hidden,false);assert.match(card.children[2].textContent,/Partilhar/);assert.match(card.children[2].textContent,/Adicionar ao ecrã principal/);
});
test('installed iPhone app hides the installation card',async()=>{
 const {card}=await installation({standalone:true});assert.equal(card.hidden,true);
});
test('Android native installation prompt still works',async()=>{
 const c=await installation({ios:false,nativePrompt:true});await c.card.children[1].onclick();assert.equal(c.prompts(),1);assert.equal(c.card.hidden,true);
});
