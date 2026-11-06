import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// DOM boundary fixture: run the actual UI controller with native-choice events.
async function screen({mobile=true,reduced=false,query='',internal=false}={}){
 const scrolls=[],animations=[],frames=new Map();let serial=0,focused;
 class Element{
  constructor(tag='section'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.selectors={};this.textContent='';}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
  append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this;this.children.push(n);}}
  prepend(node){this.append(node);this.children=[node,...this.children.filter(x=>x!==node)];}
  after(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}
  before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  querySelector(s){return this.selectors[s]||this.children.find(n=>s===n.tag)||null;}
  matches(s){return s.split(',').includes(this.tag);}
  addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);}emit(n,event={}){for(const fn of this.listeners[n]||[])fn(event);}
  getBoundingClientRect(){return {top:1000,bottom:1300};}
  focus(){focused=this;}scrollIntoView(options){scrolls.push({target:this,options});}
  animate(){animations.push(this);return {cancel(){}};}
 }
 const grid=new Element(),ui=new Element(),ids={};ui.selectors['.booking-grid']=grid;
 for(const name of ['service','barber','date','summary']){
  const section=new Element(),heading=new Element('h2');section.append(heading);section.selectors.h2=heading;grid.selectors['.'+name+'-column']=section;
  if(name==='service'||name==='barber'){
   const select=new Element('select'),list=new Element('div');select.options=[{value:name==='service'?'cabelo':'rafa',textContent:name==='service'?'Cabelo · 17,50 €':'Rafa Soares'}];select.selectedOptions=select.options;select.value=select.options[0].value;ids[name]=select;section.append(list);section.selectors['.choice-list']=list;
  }
 }
 const dates=grid.selectors['.date-column'];ids.slots=new Element('div');ids.weekdays=new Element('div');ids['booking-panel']=new Element();ids['booking-panel'].hidden=true;dates.append(ids.weekdays,ids.slots);
 const day=new Element('button');day.setAttribute('aria-label','sexta-feira, 6 de novembro de 2026');day.closest=()=>day;ids.weekdays.selectors['.day[aria-pressed=true]']=day;
 const media={matches:mobile,addEventListener(){}};
 const context=vm.createContext({document:{body:{dataset:{internal:String(internal)}},getElementById:id=>id==='calendar-ui'?ui:ids[id],createElement:tag=>new Element(tag)},location:{search:query},URLSearchParams,innerHeight:844,matchMedia:q=>q.includes('reduced')?{matches:reduced}:media,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),MutationObserver:class{constructor(fn){this.callback=fn;}observe(){}}});
 vm.runInContext(await fs.readFile(new URL('./dist/booking-flow.js',import.meta.url),'utf8'),context);
 const flush=()=>{for(const [id,fn] of frames){frames.delete(id);fn();}};
 return {ids,grid,dates,day,scrolls,animations,flush,focus:()=>focused};
}
test('service selection collapses its choices and brings the barber into reach',async()=>{
 const s=await screen();s.ids.service.emit('change');s.flush();
 assert.equal(s.grid.selectors['.service-column'].dataset.choiceCollapsed,'true');
 assert.equal(s.scrolls.at(-1).target,s.grid.selectors['.barber-column']);
 assert.equal(s.scrolls.at(-1).options.behavior,'smooth');
});
test('barber selection brings dates into reach without booking anything',async()=>{
 const s=await screen();s.ids.barber.emit('change');s.flush();
 assert.equal(s.scrolls.at(-1).target,s.dates);assert.equal(s.ids['booking-panel'].hidden,true);
});
test('editing keeps the service choices available until a new selection',async()=>{
 const s=await screen();s.ids.service.emit('change');s.flush();const section=s.grid.selectors['.service-column'];
 const edit=section.children[0].children[1];edit.onclick();s.flush();
 assert.equal(section.dataset.choiceCollapsed,'false');assert.equal(edit.getAttribute('aria-expanded'),'true');
});
test('a date selection exposes the available-hours heading and its date',async()=>{
 const s=await screen();s.ids.weekdays.emit('click',{target:s.day});s.flush();
 assert.equal(s.focus().textContent,'Horas disponíveis');
 const hours=s.dates.children.find(n=>n.className==='booking-hours-heading');assert.equal(hours.children[1].textContent,'sexta-feira, 6 de novembro de 2026');
});
test('a chosen time reveals confirmation without submitting',async()=>{
 const s=await screen();s.ids['booking-panel'].hidden=false;
 s.ids.slots.emit('click',{target:{closest:()=>({disabled:false})}});s.flush();
 assert.equal(s.scrolls.at(-1).target,s.grid.selectors['.summary-column']);
});
test('reduced-motion setting disables animated scrolling and transitions',async()=>{
 const s=await screen({reduced:true});s.ids.barber.emit('change');s.flush();
 assert.equal(s.scrolls.at(-1).options.behavior,'auto');assert.equal(s.animations.length,0);
});
test('desktop keeps the choice lists expanded',async()=>{
 const s=await screen({mobile:false});s.ids.service.emit('change');s.flush();assert.equal(s.grid.selectors['.service-column'].dataset.choiceCollapsed,'false');
});
test('choices made on the home page take mobile users directly to the calendar',async()=>{
 const s=await screen({query:'?service=cabelo&barber=rafa'});s.flush();assert.equal(s.scrolls.at(-1).target,s.dates);
});
test('disabled date and time controls do not advance the booking',async()=>{
 const s=await screen();s.day.disabled=true;s.ids.weekdays.emit('click',{target:s.day});s.ids.slots.emit('click',{target:{closest:()=>({disabled:true})}});s.flush();assert.equal(s.scrolls.length,0);
});
