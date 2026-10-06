import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {yearRecap} from '../src/recap';
import type {Prediction} from '../src/types';

const reading=(id:string,createdAt:string,question:string,extra:Partial<Prediction>={}):Prediction=>({id,question,headline:'A glimpse',createdAt,label:'',why:'',facts:{},sources:[],assumptions:[],friend:false,...extra});

test('year recap counts readings, themes, golden finds and Yes check-ins without scoring',()=>{
 const recap=yearRecap([
  reading('a','2026-03-01T12:00:00Z','Will I find love this spring?',{golden:true,outcome:'yes'}),
  reading('b','2026-05-01T12:00:00Z','Will my crush notice me?',{outcome:'no'}),
  reading('c','2026-07-01T12:00:00Z','Will I get the job promotion?',{outcome:'yes'}),
  reading('d','2025-07-01T12:00:00Z','Will I find love?',{golden:true,outcome:'yes'}),
 ],2026);
 assert.deepEqual(recap,{year:2026,readings:3,themes:[{theme:'love',count:2},{theme:'work',count:1}],golden:1,yes:2});
 assert.ok(!('accuracy' in recap));
 assert.equal(yearRecap([],2026).readings,0);
});

function circleForecasts(){
 const module={exports:{} as any},calls:unknown[][]=[];
 let plus=false;
 const code=ts.transpileModule(readFileSync(new URL('../src/SocialExtras.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const imports:Record<string,any>={
  react:{createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),useState:(initial:any)=>[initial,()=>{}]},
  'react-native':{},'./ui':{styles:{}},'./social-policy':{},'./profile':{canRead:()=>true},
  './store':{useStore:()=>({state:{plus},remaining:1,backupBusy:false})},
  './social':{setPrivateRoom:(...args:unknown[])=>{calls.push(args);return Promise.resolve()}},
 };
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const text=(list:any[])=>list.flatMap(n=>n.children).filter(c=>typeof c!=='object').join('');
 return {calls,setPlus:(value:boolean)=>{plus=value},render:(props:any)=>{const all=nodes(module.exports.CircleForecasts(props));return {all,text:text(all),id:(testID:string)=>all.find(n=>n.props.testID===testID)}}};
}
const day=(offset:number)=>new Date(Date.now()+offset*864e5).toISOString().slice(0,10);
const forecast=(id:string,due:string)=>({id,asker_id:'owner',charged_at:null,circle_id:'room',question:`Question ${id}?`,headline:`Headline ${id}`,due_date:due,created_at:due});
const snapshot=(rooms:string[],owner='owner')=>({owner,circles:[{id:'room',owner_id:'owner'}],rooms,
 forecasts:[forecast('past',day(-3)),forecast('today',day(0))],
 votes:[{forecast_id:'past',sealed:false,yes:2,no:1,pending:0,mine:'yes'},{forecast_id:'today',sealed:true,yes:null,no:null,pending:null,mine:'no'}]});

test('a private room seals tallies, shelves past forecasts and lets only a Plus owner open it',async()=>{
 const harness=circleForecasts(),act=async(operation:()=>Promise<unknown>)=>{await operation()};
 let plusOpened=0;
 const props=(data:any)=>({circle:'room',data,act,busy:false,aiConsent:'',onPlus:()=>plusOpened++});

 const room=harness.render(props(snapshot(['room'],'member')));
 assert.ok(room.id('private-room-status'));
 assert.equal(room.id('private-room-toggle'),undefined,'members cannot toggle the room');
 assert.match(room.text,/Votes sealed until everyone votes or .* · You chose Not quite/);
 assert.doesNotMatch(room.text,/null/);
 const shelf=room.id('circle-shelf');
 assert.ok(shelf);
 assert.deepEqual(shelf.children.flat().flatMap((c:any)=>c?.props?.key?[c.props.key]:[]),['today','past'],'shelf is newest first');
 assert.match(room.text,/Revealed · Circle check-in · 2 Yes · 1 Not quite · 0 Not yet/);

 const free=harness.render(props(snapshot([])));
 assert.equal(free.id('circle-shelf'),undefined);
 assert.equal(free.id('private-room-status'),undefined);
 free.id('private-room-toggle').props.onPress();
 assert.equal(plusOpened,1,'free owner is sent to Plus');
 assert.deepEqual(harness.calls,[]);

 harness.setPlus(true);
 harness.render(props(snapshot([]))).id('private-room-toggle').props.onPress();
 harness.render(props(snapshot(['room']))).id('private-room-toggle').props.onPress();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(harness.calls,[['room',true],['room',false]]);
});
