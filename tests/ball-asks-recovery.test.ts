import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as ladder from '../src/ladder';
import * as asks from '../src/ball-asks';
import * as billing from '../src/billing';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';
import {dayProgress,emptyRitual,markStep} from '../src/ritual';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function hooks(){
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>unknown,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j])){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect()})}},
 };
 return {react,render:(component:()=>any)=>{cursor=0;const tree=component();effects.splice(0).forEach(effect=>effect());return tree}};
}
function load(path:string,imports:Record<string,any>){
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,React:imports.react,require:(name:string)=>imports[name]??{'./billing':billing,'./ladder':ladder}[name],performance,console,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}});
 return module.exports;
}
async function fixture(count:number,api:Record<string,unknown>={}){
 let initial:any={sunSign:null,ageBand:'adult',facts:{},history:[],credits:0,plus:false,usage:{day:'2026-10-09',count:0},reduceMotion:true};
 for(const ask of asks.deckFor(false).slice(0,count))initial=asks.answerAsk(initial,ask.id,ask.options[0]);
 let disk=JSON.stringify(initial),writeGate:{started:()=>void;wait:Promise<void>}|undefined,failWrite=false;
 const balance={owner:'owner',asOf:'2026-10-09T00:00:00.000001Z',plus:false,plusUntil:null,packs:0,used:0,day:'2026-10-09'};
 const storeHooks=hooks(),h=hooks();
 const storeModule=load('../src/store.tsx',{
  react:storeHooks.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './cloud':{anonymousOwner:async()=>'owner',mirror:async()=>{},restoreBackup:async(s:any)=>s},
  './api':{serverMetered:false,loadBalance:async()=>balance,...api},'./social':{},
  '@react-native-async-storage/async-storage':{getItem:async(key:string)=>key==='crystal-ball-v1'?disk:null,setItem:async(_key:string,value:string)=>{const gate=writeGate;writeGate=undefined;if(gate){gate.started();await gate.wait}if(failWrite){failWrite=false;throw new Error('disk unavailable')}disk=value}},
  './native':{reopenCheckIn:()=>{}},'./daily-omen':{},'./omen-widget':{},
 });
 const store=()=>storeHooks.render(()=>storeModule.Store({})).props.value;
 store();await tick();store();await tick();
 const notices:string[]=[];
 const module=load('../src/BallAsks.tsx',{
  react:h.react,'react-native':{View:'View',Pressable:'Pressable'},'./ui':{Action:'Action',Txt:'Txt',CardHeader:'CardHeader',colors:{},fonts:{},styles:{}},'./Enter':{Enter:'Enter'},'./Surface':{Surface:'Surface'},'./native':{haptic:()=>{}},'./ball-asks':asks,'./billing':billing,'./api':{serverMetered:false,...api},'./store':{useStore:store},'./story-card':{portraitCard:()=>null},
 });
 const render=(aiConsent:string|null='')=>h.render(()=>module.BallAsks({aiConsent,reduce:true,onNotice:(text:string)=>notices.push(text)}));
 const blockWrite=()=>{
  let started!:()=>void,release!:()=>void;
  const began=new Promise<void>(resolve=>{started=resolve}),wait=new Promise<void>(resolve=>{release=resolve});
  writeGate={started,wait};return {began,release};
 };
 return {render,store,notices,balance,blockWrite,failWrite:()=>{failWrite=true},state:()=>JSON.parse(disk)};
}
function find(tree:any,id:string):any{
 if(!tree||typeof tree!=='object')return undefined;
 if(tree.props?.testID===id)return tree;
 for(const child of Array.isArray(tree)?tree:tree.children??[]){const match=find(child,id);if(match)return match}
}

test('catch-up insights wait for dismissal, advance without remounting, and return to questions',async()=>{
 const kinds:string[]=[];
 const f=await fixture(20,{requestInsight:async(_facts:any,kind:string)=>{kinds.push(kind);return {kind,title:kind,text:'Reflection',at:String(kinds.length)}}});
 f.render(null);await tick();assert.equal(kinds.length,0);
 f.render();await tick();let tree=f.render();
 assert.equal(kinds.length,1);assert.ok(find(tree,'ask-insight'));
 f.render();await tick();assert.equal(kinds.length,1);
 find(tree,'ask-keep-going').props.onPress();tree=f.render();
 assert.ok(find(tree,'ask-insight-forming'));await tick();tree=f.render();
 assert.deepEqual(kinds,['portrait','enjoy']);assert.equal(f.state().asks.insights.length,2);
 find(tree,'ask-keep-going').props.onPress();tree=f.render();
 assert.ok(find(tree,'ask-question'));assert.equal(find(tree,'ask-insight-forming'),undefined);
});

test('failed catch-up insight can defer, resume on the next answer, and retry',async()=>{
 let attempts=0;
 const f=await fixture(20,{requestInsight:async()=>{attempts++;if(attempts<3)throw new Error('offline');return {kind:'portrait',title:'Portrait',text:'Reflection',at:'1'}}});
 f.render();await tick();let tree=f.render();assert.ok(find(tree,'ask-insight-retry'));
 find(tree,'ask-insight-later').props.onPress();tree=f.render();assert.ok(find(tree,'ask-question'));
 find(tree,'ask-option-0').props.onPress();f.render();await tick();tree=f.render();
 find(tree,'ask-insight-retry').props.onPress();f.render();await tick();tree=f.render();
 assert.equal(attempts,3);assert.ok(find(tree,'ask-insight'));
});

test('failed bonus claims expose a retry without another answer and credit once',async()=>{
 const claims:string[][]=[];
 const f=await fixture(25,{serverMetered:true,claimAskBonus:async(ids:string[])=>{claims.push([...ids]);if(claims.length===1)throw new Error('offline');return {owner:'owner',asOf:'2026-10-09T00:00:00.000002Z',plus:false,plusUntil:null,packs:1,used:0,day:'2026-10-09'}},requestInsight:async()=>{throw new Error('unused')}});
 f.render(null);await tick();let tree=f.render(null);
 assert.equal(f.state().asks.bonus,0);assert.ok(find(tree,'ask-bonus-retry'));
 find(tree,'ask-bonus-retry').props.onPress();f.render(null);await tick();tree=f.render(null);
 assert.equal(f.state().asks.bonus,1);assert.deepEqual(claims[0],claims[1]);assert.equal(find(tree,'ask-bonus-retry'),undefined);
 f.render(null);await tick();assert.equal(claims.length,2);
});

for(const metered of [false,true])test(`insight and ${metered?'server':'local'} bonus persist behind an archive lock`,async()=>{
 let resolveInsight!:(value:any)=>void,requests=0;
 const insight={kind:'portrait',title:'Portrait',text:'Reflection',at:'2026-10-09'};
 const pending=new Promise(resolve=>{resolveInsight=resolve});
 const bonusBalance={owner:'owner',asOf:'2026-10-09T00:00:00.000002Z',plus:false,plusUntil:null,packs:2,used:0,day:'2026-10-09'};
 const f=await fixture(50,{serverMetered:metered,claimAskBonus:async()=>bonusBalance,requestInsight:()=>{requests++;return pending}});
 const gate=f.blockWrite();
 f.render();await gate.began;
 resolveInsight(insight);await tick();
 let tree=f.render();
 assert.equal(find(tree,'ask-insight'),undefined);assert.equal(f.notices.length,0);
 assert.equal(f.state().asks.insights.length,0);assert.equal(f.state().asks.bonus,0);
 const refresh=f.store().applyBalance({...bonusBalance,asOf:'2026-10-09T00:00:00.000003Z'});
 gate.release();await refresh;await tick();tree=f.render();
 assert.ok(find(tree,'ask-insight'));assert.equal(f.state().asks.insights.length,1);
 assert.equal(f.state().asks.bonus,2);assert.equal(f.state().credits,2);assert.equal(f.notices.length,1);
 f.render();await tick();assert.equal(requests,1);
});

test('insight storage failure shows retry without displaying or counting the insight',async()=>{
 let requests=0;
 const f=await fixture(10,{requestInsight:async()=>({kind:'portrait',title:'Portrait',text:'Reflection',at:String(++requests)})});
 f.failWrite();f.render();await tick();let tree=f.render();
 assert.ok(find(tree,'ask-insight-retry'));assert.equal(find(tree,'ask-insight'),undefined);
 assert.equal(f.state().asks.insights.length,0);
 find(tree,'ask-insight-retry').props.onPress();f.render();await tick();tree=f.render();
 assert.ok(find(tree,'ask-insight'));assert.equal(f.state().asks.insights.length,1);
});

test('queued progress rejects an archive replacement instead of announcing success',async()=>{
 const f=await fixture(10),store=f.store();
 await store.backup('restore',async()=>{});
 await assert.rejects(store.saveAskProgress((s:any)=>({...s,credits:99})),/account changed/);
 assert.equal(f.state().credits,0);
});

for(const metered of [false,true])test(`${metered?'server':'local'} bonus storage failure stays retryable and credits once`,async()=>{
 const balance={owner:'owner',asOf:'2026-10-09T00:00:00.000002Z',plus:false,plusUntil:null,packs:1,used:0,day:'2026-10-09'};
 const f=await fixture(25,{serverMetered:metered,claimAskBonus:async()=>balance});
 f.failWrite();f.render(null);await tick();let tree=f.render(null);
 assert.ok(find(tree,'ask-bonus-retry'));assert.equal(f.notices.length,0);
 assert.equal(f.state().asks.bonus,0);assert.equal(f.state().credits,0);
 find(tree,'ask-bonus-retry').props.onPress();f.render(null);await tick();tree=f.render(null);
 assert.equal(find(tree,'ask-bonus-retry'),undefined);assert.equal(f.notices.length,1);
 assert.equal(f.state().asks.bonus,1);assert.equal(f.state().credits,1);
});

 test('existing-answer controls complete Today after the deck is exhausted',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,12)});
 const deck=asks.deckFor(false),f=await fixture(deck.length);
 f.render(null);await tick();f.render(null);await tick();
 t.mock.timers.setTime(new Date(2026,9,10,12).getTime());
 f.store().update((s:any)=>({...s,ritual:markStep(markStep(emptyRitual(),'omen'),'ask')}));
 await tick();
 find(f.render(null),'ask-answers').props.onPress();
 const before=f.state();
 assert.equal(asks.nextAsk(before,false),undefined);
 const nodes=(tree:any):any[]=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...(tree.children??[]).flatMap(nodes)];
 const edit=(index:number,option:number)=>{
  const card=nodes(f.render(null)).find(n=>n.props.key===asks.selfKey(deck[index].id));
  const control=nodes(card).find(n=>n.props.accessibilityRole==='radio'&&n.props.key===deck[index].options[option]);
  assert.ok(control);control.props.onPress();f.render(null);
 };
 edit(0,0);await tick();
 assert.equal(dayProgress(f.state().ritual).steps.find(s=>s.id==='questions')!.count,0);
 for(let i=0;i<3;i++){
  edit(i,1);await tick();
  const state=f.state();
  assert.equal(state.facts[asks.selfKey(deck[i].id)],deck[i].options[1]);
  assert.equal(dayProgress(state.ritual).steps.find(s=>s.id==='questions')!.count,i+1);
  assert.equal(dayProgress(state.ritual).done,i===2);
 }
 edit(3,1);await tick();
 assert.deepEqual(f.state().ritual.stars,['2026-10-10']);
 assert.equal(f.state().ritual.counts.fullDays,1);
 assert.deepEqual(f.state().asks.seen,before.asks.seen);
 assert.equal(f.state().asks.bonus,before.asks.bonus);
 assert.equal(f.state().credits,before.credits);
 t.mock.timers.setTime(new Date(2026,9,11,0,1).getTime());
 edit(0,0);await tick();
 assert.equal(dayProgress(f.state().ritual).steps.find(s=>s.id==='questions')!.count,1);
 assert.deepEqual(f.state().ritual.stars,['2026-10-10']);
});
