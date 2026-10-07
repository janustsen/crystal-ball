import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeMock} from './home-mock';
import * as retention from '../src/retention';
import {circleReading} from '../src/reading-history';
import {canRead} from '../src/profile';
import * as billing from '../src/billing';
import * as storyCard from '../src/story-card';

const code=ts.transpileModule(readFileSync(new URL('../app/index.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;

const socialCode=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;

function app(onboardingDone=true,history:any[]=[],seal:string|undefined='sealed-receipt',account:object={},spent=false){
 const params:{seal?:string;social?:string}={seal},slots:any[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[]):any=>typeof type==='function'?type({...props,children}):({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:()=>{},
 };
 const state={onboardingDone,ageConfirmed:true,facts:{},history,usage:{day:'2026-10-03',count:0},credits:0,plus:false,reduceMotion:true,...account};
 const imports:Record<string,any>={
  '../src/api':{webReadingVisitor:()=>false,webReadingSpent:()=>spent},'../src/retention':retention,'../src/billing':billing,'../src/purchases':{purchaseMode:'mock'},react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining:1})},
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(react),
  '../src/profile':{canRead},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:()=>({friend:false})},
  '../src/SocialScreen':{SealedCard:'SealedCard',Social:'Social',SealForecast:'SealForecast',InstallAction:'InstallAction'},'../src/RevealClip':{RevealClip:'RevealClip'},
  '../src/Onboarding':{Onboarding:'Onboarding'},'../src/native':{haptic:()=>{}},
  '../src/InnerLibrary':{InnerLibrary:'InnerLibrary'},
 };
 const sealSlots:any[]=[];
 let sealCursor=0;
 const sealReact={...react,useState:(initial:any)=>{const i=sealCursor++;if(!(i in sealSlots))sealSlots[i]=initial;return [sealSlots[i],(value:any)=>{sealSlots[i]=value}]}};
 const socialModule={exports:{} as any};
 const socialImports:Record<string,any>={react:sealReact,'react-native':{Platform:{OS:'web'},View:'View',Pressable:'Pressable'},'./Surface':{Surface:'Surface'},'./ui':{Action:'Action',Txt:'Txt',Orb:'Orb',styles:{},colors:{}},'./social':{openForecast:async()=>reading.headline},'./api':{webReadingSpent:()=>spent}};
 runInNewContext(socialCode,{module:socialModule,exports:socialModule.exports,process:{env:{}},require:(name:string)=>socialImports[name]??{}});
 imports['../src/SocialScreen'].SealedCard=(props:any)=>{sealCursor=0;return react.createElement('SealedCard',props,socialModule.exports.SealedCard(props))};
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??(name==='../src/story-card'?storyCard:name==='../src/uuid'?{uuid:()=>crypto.randomUUID()}:{})});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.default())};
 return {params,render};
}

test('sealed landing allows existing users to navigate every tab and plans',()=>{
 for(const destination of ['home','sky','ask','history','you','plans']){
  const {params,render}=app();
  assert.ok(render().some(n=>n.type==='SealedCard'));
  const control=render().find(n=>n.props.testID===(destination==='plans'?'view-plans':`tab-${destination}`));
  assert.ok(control,destination);control.props.onPress();
  const next=render();
  assert.equal(params.seal,undefined,destination);
  assert.ok(!next.some(n=>n.type==='SealedCard'),destination);
  if(destination==='plans')assert.ok(next.some(n=>n.props.label==='Continue with Plus · simulate'));
  if(destination==='sky')assert.ok(next.some(n=>n.type==='Social'));
 }
});

test('sealed links still open before onboarding and close after Ask navigation',()=>{
 assert.ok(app(false).render().some(n=>n.type==='SealedCard'));
 assert.ok(!app(false).render().some(n=>n.type==='Onboarding'));
 const {render,params}=app();
 render().find(n=>n.props.testID==='tab-ask').props.onPress();
 render().find(n=>n.props.testID==='close-flow').props.onPress();
 assert.equal(params.seal,undefined);
 assert.ok(render().some(n=>n.props.testID==='tab-home'&&n.props.accessibilityState.selected));
});


test('Circle archive directs check-ins to Circles without personal prompts or reminders',()=>{
 const reading=circleReading({id:'forecast',circle_id:'circle',asker_id:'owner',charged_at:'done',question:'Will we learn?',headline:'A shared skill awaits.',due_date:'2020-01-01',created_at:'2020-01-01'});
 const {render,params}=app(true,[reading]);
 render().find(n=>n.props.testID==='tab-home').props.onPress();
 assert.ok(!render().some(n=>n.props.label==='Your check-ins are ready'));
 render().find(n=>n.props.testID==='tab-history').props.onPress();
 const archive=render();
 assert.ok(archive.some(n=>n.children.includes('Circle check-in · Vote in Circles')));
 archive.find(n=>n.props.accessibilityRole==='button'&&n.props.key==='forecast').props.onPress();
 assert.ok(!render().some(n=>n.props.testID==='remind-me-to-check-back'||n.props.testID==='check-in-yes'));
 render().find(n=>n.props.label==='Open Circle check-in').props.onPress();
 assert.equal(params.social,'circles');assert.ok(render().some(n=>n.type==='Social'));
 assert.equal(retention.personalCheckInDue({...reading,circleId:undefined}),true);
 assert.equal(retention.checkInLabel({...reading,circleId:undefined}),'Ready to check in');
});

test('the Inner Library opens from the Home room spot and You; its locked door leads to Plus and back',()=>{
 const {render}=app();
 render().find(n=>n.props.testID==='tab-home').props.onPress();
 const spot=render().find(n=>n.props.testID==='room-inner-library');
 assert.equal(spot.props.locked,true);spot.props.onPress();
 let room=render();
 assert.ok(room.some(n=>n.children.includes('Inner Library')),'header names the room');
 room.find(n=>n.type==='InnerLibrary').props.onUpgrade();
 const plans=render();
 assert.ok(plans.some(n=>n.props.label==='Continue with Plus · simulate'));
 for(const unlock of billing.plusUnlocks)assert.ok(plans.some(n=>n.children.includes(`· ${unlock}`)),unlock);
 render().find(n=>n.props.testID==='close-flow').props.onPress();
 assert.ok(render().some(n=>n.type==='InnerLibrary'),'closing Plans returns to the room');
 render().find(n=>n.props.testID==='tab-you').props.onPress();
 const entry=render().find(n=>n.props.testID==='open-inner-library');
 assert.equal(entry.props.label,'Inner Library · Plus');entry.props.onPress();
 room=render();
 assert.ok(room.some(n=>n.type==='InnerLibrary'));
 assert.ok(!room.some(n=>n.props.testID==='tab-you'&&n.props.accessibilityState?.selected),'the room is not a tab');
});

const reading={id:'reading',question:'Will I finish my course?',headline:'You will finish your course next month.',createdAt:'2026-10-01T00:00:00Z',label:'Speculative forecast · not a guarantee',why:'Practice adds up.',facts:{},sources:[],assumptions:[],friend:false};
const openReading=(render:()=>any[])=>{
 render().find(n=>n.props.testID==='tab-history').props.onPress();
 render().find(n=>n.props.accessibilityRole==='button'&&n.props.key==='reading').props.onPress();
 return render();
};

test('a reveal leads with Seal it for a friend; Share and Ask again stay secondary',()=>{
 const {render}=app(true,[reading],'');
 render().find(n=>n.props.testID==='tab-home').props.onPress();
 const reveal=openReading(render);
 const seal=reveal.findIndex(n=>n.type==='SealForecast'),share=reveal.findIndex(n=>n.props.label==='Share this glimpse');
 assert.ok(seal>=0&&share>seal,'seal comes before share');
 assert.equal(reveal[share].props.quiet,true);
 assert.ok(reveal.some(n=>n.type==='RevealClip'&&n.props.prediction.id==='reading'));
 assert.ok(reveal.some(n=>n.props.testID==='ask-another-question'));
 assert.ok(!reveal.some(n=>n.type==='InstallAction'));
});

test('a sealed-link browser visitor starts their free reading from the seal, then is sent to install',()=>{
 const {render,params}=app(true,[reading]);
 render().find(n=>n.type==='SealedCard').props.onAsk();
 assert.equal(params.seal,undefined);
 assert.ok(render().some(n=>n.props.testID==='close-flow'),'Ask opens');
 render().find(n=>n.props.testID==='close-flow').props.onPress();
 const reveal=openReading(render);
 assert.ok(reveal.some(n=>n.type==='InstallAction'));
 assert.ok(!reveal.some(n=>n.props.testID==='ask-another-question'));
});

 test('Ask navigation from a sealed landing keeps the visitor restriction',()=>{
 const {render}=app(true,[reading]);
 render().find(n=>n.props.testID==='tab-ask').props.onPress();
 render().find(n=>n.props.testID==='close-flow').props.onPress();
 const reveal=openReading(render);
 assert.ok(reveal.some(n=>n.type==='InstallAction'));
 assert.ok(!reveal.some(n=>n.props.testID==='ask-another-question'));
});

test('a used-up web trial never blocks a Plus, credited or linked account in the same browser',async()=>{
 for(const account of [{plus:true},{credits:3},{backupOwner:'apple-user'}]){
  const {render,params}=app(true,[reading],'sealed-receipt',account,true);
  render().find(n=>n.props.testID==='open-sealed-forecast').props.onPress();
  await new Promise(resolve=>setImmediate(resolve));
  const ask=render().find(n=>n.props.testID==='web-reading-start');
  assert.ok(ask,JSON.stringify(account));
  assert.ok(!render().some(n=>n.children.includes('One free reading here. No account needed.')));
  ask.props.onPress();
  assert.equal(params.seal,undefined);
  assert.ok(render().some(n=>n.children.includes('Come closer…')));
  render().find(n=>n.props.testID==='close-flow').props.onPress();
  const reveal=openReading(render);
  assert.ok(reveal.some(n=>n.props.testID==='ask-another-question'),JSON.stringify(account));
  assert.ok(!reveal.some(n=>n.type==='InstallAction'),JSON.stringify(account));
 }
});

test('sealed landing offers anonymous visitors only an unspent free reading',async()=>{
 for(const spent of [false,true]){
  const {render}=app(true,[],'sealed-receipt',{},spent);
  render().find(n=>n.props.testID==='open-sealed-forecast').props.onPress();
  await new Promise(resolve=>setImmediate(resolve));
  const landing=render();
  assert.equal(landing.some(n=>n.props.testID==='web-reading-start'),!spent);
  assert.equal(landing.some(n=>n.children.includes('One free reading here. No account needed.')),!spent);
  assert.ok(landing.some(n=>n.props.label==='Open Crystal Ball app'));
 }
});
