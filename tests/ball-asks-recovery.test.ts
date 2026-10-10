import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as asks from '../src/ball-asks';
import * as billing from '../src/billing';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(count:number,api:Record<string,unknown>={}){
 let state:any={sunSign:null,ageBand:'adult',facts:{},history:[],credits:0,plus:false,usage:{day:'2026-10-09',count:0},reduceMotion:true,largeText:false};
 for(const ask of asks.deckFor(false).slice(0,count))state=asks.answerAsk(state,ask.id,ask.options[0]);
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>unknown,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j])){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect()})}},
 };
 const imports:Record<string,any>={react,'react-native':{View:'View',Pressable:'Pressable'},'./ui':{Action:'Action',Txt:'Txt',CardHeader:'CardHeader',colors:{},fonts:{},styles:{}},'./Enter':{Enter:'Enter'},'./Surface':{Surface:'Surface'},'./native':{haptic:()=>{}},'./ball-asks':asks,'./billing':billing,'./api':{serverMetered:false,...api},'./store':{useStore:()=>({state,update:(fn:any)=>{state=fn(state)},applyBalance:async()=>{}})}};
 const code=ts.transpileModule(readFileSync(new URL('../src/BallAsks.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]});
 const render=(aiConsent:string|null='')=>{cursor=0;const tree=module.exports.BallAsks({aiConsent,reduce:true,onNotice:()=>{}});effects.splice(0).forEach(effect=>effect());return tree};
 return {render,state:()=>state};
}
function find(tree:any,id:string):any{
 if(!tree||typeof tree!=='object')return undefined;
 if(tree.props?.testID===id)return tree;
 for(const child of Array.isArray(tree)?tree:tree.children??[]){const match=find(child,id);if(match)return match}
}

test('catch-up insights wait for dismissal, advance without remounting, and return to questions',async()=>{
 const kinds:string[]=[];
 const f=fixture(20,{requestInsight:async(_facts:any,kind:string)=>{kinds.push(kind);return {kind,title:kind,text:'Reflection',at:String(kinds.length)}}});
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
 const f=fixture(20,{requestInsight:async()=>{attempts++;if(attempts<3)throw new Error('offline');return {kind:'portrait',title:'Portrait',text:'Reflection',at:'1'}}});
 f.render();await tick();let tree=f.render();assert.ok(find(tree,'ask-insight-retry'));
 find(tree,'ask-insight-later').props.onPress();tree=f.render();assert.ok(find(tree,'ask-question'));
 find(tree,'ask-option-0').props.onPress();f.render();await tick();tree=f.render();
 find(tree,'ask-insight-retry').props.onPress();f.render();await tick();tree=f.render();
 assert.equal(attempts,3);assert.ok(find(tree,'ask-insight'));
});

test('failed bonus claims expose a retry without another answer and credit once',async()=>{
 const claims:string[][]=[];
 const f=fixture(25,{serverMetered:true,claimAskBonus:async(ids:string[])=>{claims.push([...ids]);if(claims.length===1)throw new Error('offline');return {}},requestInsight:async()=>{throw new Error('unused')}});
 f.render(null);await tick();let tree=f.render(null);
 assert.equal(f.state().asks.bonus,0);assert.ok(find(tree,'ask-bonus-retry'));
 find(tree,'ask-bonus-retry').props.onPress();f.render(null);await tick();tree=f.render(null);
 assert.equal(f.state().asks.bonus,1);assert.deepEqual(claims[0],claims[1]);assert.equal(find(tree,'ask-bonus-retry'),undefined);
 f.render(null);await tick();assert.equal(claims.length,2);
});
