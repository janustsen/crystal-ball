import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {identity,yearRecap} from '../src/recap';
import {skyPrompts} from '../src/social-policy';
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
  'react-native':{},'./Surface':{Surface:'Surface'},'./ui':{styles:{}},'./social-policy':{},'./profile':{canRead:()=>true},
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

test('a private room preserves its shelf for free owners and requires Plus only to enable it',async()=>{
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
 harness.setPlus(false);
 const lapsed=harness.render(props(snapshot(['room'])));
 assert.ok(lapsed.id('circle-shelf'));
 assert.ok(lapsed.id('circle-tally-sealed'));
 lapsed.id('private-room-toggle').props.onPress();
 assert.equal(plusOpened,1,'free owner may turn the room off without a paywall');
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(harness.calls,[['room',true],['room',false]]);
});


test('History retains completed recaps across year rollover, with Plus gating for every year',()=>{
 const module={exports:{} as any};
 const state={plus:true,history:[reading('a','2026-03-01T12:00:00Z','Will I find love?',{golden:true,outcome:'yes'}),reading('b','2025-06-01T12:00:00Z','Will I get the job?')]};
 const element=(type:any,props:any)=>({type,props:props??{}});
 const imports:Record<string,any>={
  'react/jsx-runtime':{jsx:element,jsxs:element},'react-native':{},'./Surface':{Surface:'Surface'},'./ui':{styles:{},colors:{}},
  './store':{useStore:()=>({state})},'./social-policy':{skyPrompts},'./recap':{yearRecap,identity},
 };
 const code=ts.transpileModule(readFileSync(new URL('../src/YearRecap.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const January2027=new Proxy(Date,{construct:(target,args)=>Reflect.construct(target,args.length?args:['2027-01-01T12:00:00Z'])});
 runInNewContext(code,{module,exports:module.exports,Date:January2027,require:(name:string)=>imports[name]});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props.children)];
 const text=(node:any):string=>node==null?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(''):(node.props.title??'')+text(node.props.children);
 let upgrades=0;
 const render=()=>module.exports.YearRecap({onPlus:()=>upgrades++,onShare:()=>{}});
 let tree=render();
 assert.equal(nodes(tree).filter(n=>n.props.testID==='year-recap-share').length,0,'sharing the year waits for December');
 assert.deepEqual(nodes(tree).filter(n=>/^year-recap-\d+$/.test(n.props.testID)).map(n=>n.props.testID),['year-recap-2027','year-recap-2026','year-recap-2025']);
 assert.match(text(tree),/Your 2027 in forecasts0 readings/);
 assert.match(text(tree),/Your 2026 in forecastsThe Hopeful Romantic1 reading · 1 golden find · 1 Yes check-in/);
 state.history.push(reading('c','2027-01-01T12:00:00Z','Will I learn a skill?'));
 tree=render();
 assert.match(text(tree),/Your 2027 in forecastsThe Eternal Student1 reading/);
 assert.match(text(tree),/Your 2026 in forecastsThe Hopeful Romantic1 reading · 1 golden find · 1 Yes check-in/);
 state.plus=false;
 tree=render();
 assert.doesNotMatch(text(tree),/1 reading|1 golden find|1 Yes check-in|Most asked:/);
 const gates=nodes(tree).filter(n=>n.props.testID?.startsWith('year-recap-plus'));
 assert.equal(gates.length,3);
 gates.forEach(n=>n.props.onPress());
 assert.equal(upgrades,3);
});

test('In December, Plus can share the current year in the Ball',()=>{
 const module={exports:{} as any};
 const state={plus:true,history:[reading('a','2026-03-01T12:00:00Z','Will I get the job?'),reading('b','2025-06-01T12:00:00Z','Will I find love?')]};
 const element=(type:any,props:any)=>({type,props:props??{}});
 const imports:Record<string,any>={'react/jsx-runtime':{jsx:element,jsxs:element},'react-native':{},'./Surface':{Surface:'Surface'},'./ui':{styles:{},colors:{}},'./store':{useStore:()=>({state})},'./social-policy':{skyPrompts},'./recap':{yearRecap,identity}};
 const code=ts.transpileModule(readFileSync(new URL('../src/YearRecap.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const December2026=new Proxy(Date,{construct:(target,args)=>Reflect.construct(target,args.length?args:['2026-12-10T12:00:00Z'])});
 runInNewContext(code,{module,exports:module.exports,Date:December2026,require:(name:string)=>imports[name]});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props.children)];
 let shared=0;
 const render=()=>nodes(module.exports.YearRecap({onPlus:()=>{},onShare:()=>shared++})).filter(n=>n.props.testID==='year-recap-share');
 const buttons=render();
 assert.equal(buttons.length,1,'only the current year is shared');
 buttons[0].props.onPress();assert.equal(shared,1);
 state.plus=false;assert.equal(render().length,0,'the year card carries Plus counts');
});
