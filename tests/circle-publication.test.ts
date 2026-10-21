import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as billing from '../src/billing';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';

const code=ts.transpileModule(readFileSync(new URL('../src/store.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// The server charges publication; the Store only serializes it and keeps the asker's copy.
for(const lost of [false,true])test(`Store serializes publication with ${lost?'lost':'successful'} response`,async()=>{
 const day=new Date().toISOString().slice(0,10);
 let disk=JSON.stringify({onboardingDone:true,ageConfirmed:true,ageBand:'adult',ladder:{asked:20,opened:[]},sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:false});
 const card={id:'receipt',asker_id:'asker',circle_id:'circle',charged_at:null,question:'Will we learn together?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:new Date().toISOString()};
 let respond!:(value:typeof card)=>void,reject!:(error:Error)=>void,started=false;
 const response=new Promise<typeof card>((resolve,fail)=>{respond=resolve;reject=fail});
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),createElement:(_type:any,props:any)=>props.value,
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j])){slots[i]=deps;effects.push(effect)}},
 };
 const imports:Record<string,any>={
  react,'react-native':{},'./reading-history':readings,'./profile':profile,'./billing':billing,
  './social':{publishCircleForecast:async()=>{started=true;return response}},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './daily-omen':{forgetOmen:async()=>{}},'./native':{forgetCheckIns:async()=>{}},'./omen-widget':{updateOmenWidget:()=>{}},
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{},setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},performance});
 const render=()=>{cursor=0;const store=module.exports.Store({});effects.splice(0).forEach(effect=>effect());return store};
 render();await tick();const store=render();await tick();
 const publication=store.publishCircle('draft');
 const outcome=publication.then(()=>null,(error:Error)=>error);
 await tick();assert.equal(started,true);
 const forgetting=store.forgetAll();
 await tick();assert.equal(JSON.parse(disk).credits,2);
 if(lost)reject(new Error('response lost'));else respond(card);
 const error=await outcome;await forgetting;
 assert.equal(Boolean(error),lost);
 assert.equal(JSON.parse(disk).credits,2);
 assert.deepEqual(JSON.parse(disk).history,[]);
});

for(const replacement of ['none','forget','restore'])test(`private saves survive Circle publication before ${replacement}`,async()=>{
 const day=new Date().toISOString().slice(0,10);
 let disk=JSON.stringify({onboardingDone:true,ageConfirmed:true,ageBand:'adult',ladder:{asked:20,opened:[]},sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:false});
 const card={id:'receipt',asker_id:'asker',circle_id:'circle',charged_at:null,question:'Will we learn together?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:new Date().toISOString()};
 let respond!:(value:typeof card)=>void,reject!:(error:Error)=>void,started=false;
 const response=new Promise<typeof card>((resolve,fail)=>{respond=resolve;reject=fail});
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),createElement:(_type:any,props:any)=>props.value,
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j])){slots[i]=deps;effects.push(effect)}},
 };
 const imports:Record<string,any>={
  react,'react-native':{},'./reading-history':readings,'./profile':profile,'./billing':billing,
  './cloud':{restoreBackup:async(state:any)=>({...state,history:[],facts:{}})},
  './social':{publishCircleForecast:async()=>{started=true;return response}},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './daily-omen':{forgetOmen:async()=>{}},'./native':{forgetCheckIns:async()=>{}},'./omen-widget':{updateOmenWidget:()=>{}},
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{},setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},performance});
 const render=()=>{cursor=0;const store=module.exports.Store({});effects.splice(0).forEach(effect=>effect());return store};
 render();await tick();const store=render();await tick();

 const publication=store.publishCircle('draft');await tick();
 const privateReading={...readings.circleReading(card),id:'private',circleId:undefined};
 let saved=false;
 const saving=store.savePrediction(privateReading,{interest:'music'}).then(()=>{saved=true});
 const duplicate=store.savePrediction(privateReading);
 const replacing=replacement==='forget'?store.forgetAll():replacement==='restore'?store.backup('restore',async()=>{}):Promise.resolve();
 await tick();assert.equal(saved,false);assert.deepEqual(JSON.parse(disk).history,[]);
 respond(card);await Promise.all([publication,saving,duplicate,replacing]);
 assert.equal(saved,true);assert.equal(JSON.parse(disk).credits,1);
 assert.deepEqual(JSON.parse(disk).history.map((p:any)=>p.id),replacement==='none'?['private','receipt']:[]);
 assert.deepEqual(JSON.parse(disk).facts,replacement==='none'?{interest:'music'}:{});
});
