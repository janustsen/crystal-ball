import test from 'node:test';
import assert from 'node:assert/strict';
import * as ballAsks from '../src/ball-asks';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeMock} from './home-mock';
import * as retention from '../src/retention';
import * as ritual from '../src/ritual';
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
  // A memoized callback holds one hook slot and keeps its first identity, as its empty dependency list does in React.
  useCallback:(callback:any)=>{const i=cursor++;return slots[i]??(slots[i]=callback)},
  useEffect:()=>{},
 };
 const state={ritual:ritual.emptyRitual(),onboardingDone,ageConfirmed:true,facts:{},history,usage:{day:'2026-10-03',count:0},credits:0,plus:false,reduceMotion:true,...account};
 const imports:Record<string,any>={
  '../src/api':{webReadingVisitor:()=>false,webReadingSpent:()=>spent},'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,'../src/purchases':{purchaseMode:'mock'},react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining:1,update:(fn:(value:typeof state)=>typeof state)=>Object.assign(state,fn(state))})},
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(react),
  '../src/profile':{canRead},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:()=>({friend:false})},
  '../src/SocialScreen':{SealedCard:'SealedCard',Social:'Social',SealForecast:'SealForecast',InstallAction:'InstallAction'},'../src/RevealClip':{RevealClip:'RevealClip'},
  '../src/social':{shareCircleMoment:async()=>{}},'../src/Onboarding':{Onboarding:'Onboarding'},'../src/native':{haptic:()=>{}},
  '../src/InnerLibrary':{InnerLibrary:'InnerLibrary'},'../src/DailyOmen':{DailyOmen:'DailyOmen'},'../src/DailyRitual':{TodayCard:'TodayCard'},
 };
 const sealSlots:any[]=[];
 let sealCursor=0;
 const sealReact={...react,useState:(initial:any)=>{const i=sealCursor++;if(!(i in sealSlots))sealSlots[i]=initial;return [sealSlots[i],(value:any)=>{sealSlots[i]=value}]}};
 const socialModule={exports:{} as any};
 const socialImports:Record<string,any>={react:sealReact,'react-native':{Platform:{OS:'web'},View:'View',Pressable:'Pressable'},'./Surface':{Surface:'Surface'},'./ui':{Action:'Action',Txt:'Txt',Orb:'Orb',styles:{},colors:{}},'./social':{openForecast:async()=>reading.headline},'./api':{webReadingSpent:()=>spent}};
 runInNewContext(socialCode,{module:socialModule,exports:socialModule.exports,process:{env:{}},require:(name:string)=>socialImports[name]??{}});
 imports['../src/SocialScreen'].SealedCard=(props:any)=>{sealCursor=0;return react.createElement('SealedCard',props,socialModule.exports.SealedCard(props))};
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??(name==='../src/story-card'?storyCard:name==='../src/uuid'?{uuid:()=>crypto.randomUUID()}:name==='../src/ball-asks'?ballAsks:name==='../src/BallAsks'?{BallAsks:'BallAsks'}:{})});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.default())};
 return {params,render,state};
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


test('an omen callback retained across midnight records the new day once',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,7,23,59)});
 const previous=ritual.markStep(ritual.markStep(ritual.markStep(ritual.emptyRitual(),'questions',retention.localDay(),3),'ask'),'omen');
 const {render,state}=app(true,[],'',{ritual:previous});
 const onRead=render().find(n=>n.type==='DailyOmen').props.onRead;
 onRead();
 assert.equal(state.ritual.days['2026-10-07'].omen,1);
 t.mock.timers.setTime(new Date(2026,9,8,0,1).getTime());
 state.ritual=ritual.markStep(ritual.markStep(state.ritual,'questions',retention.localDay(),3),'ask');
 onRead();onRead();
 assert.equal(state.ritual.days['2026-10-08'].omen,1);
 assert.deepEqual(state.ritual.stars,['2026-10-07','2026-10-08']);
 assert.equal(state.ritual.counts.fullDays,2);
});


for(const outcome of ['yes','no','pending'])test(`Today progress requires a fresh due-today check-in, answer=${outcome}`,t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,12)});
 for(const dueDate of ['2026-10-09','2026-10-10','2026-11-10'])for(const previous of [undefined,'yes','no','pending']){
  const {render,state}=app(true,[{...reading,dueDate,outcome:previous}],'',{ritual:ritual.markStep(ritual.markStep(ritual.emptyRitual(),'questions','2026-10-10',3),'omen','2026-10-10')});
  const control=openReading(render).find(n=>n.props.testID===`check-in-${outcome}`);
  control.props.onPress();
  assert.equal(state.history[0].outcome,outcome);
  assert.equal(state.history[0].checkedInAt,'2026-10-10');
  const eligible=dueDate==='2026-10-10'&&previous===undefined;
  assert.equal(ritual.dayProgress(state.ritual,'2026-10-10').done,eligible);
  assert.equal(state.ritual.stars.length,eligible?1:0);
  control.props.onPress();assert.equal(state.ritual.stars.length,eligible?1:0);
  t.mock.timers.setTime(new Date(2026,9,11,12).getTime());
  control.props.onPress();assert.equal(ritual.dayProgress(state.ritual,'2026-10-11').lit,0);
  t.mock.timers.setTime(new Date(2026,9,10,12).getTime());
 }
});

test('check-in eligibility reads the latest saved forecast rather than the open reveal',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,12)});
 const {render,state}=app(true,[{...reading,dueDate:'2026-10-10'}],'');
 const control=openReading(render).find(n=>n.props.testID==='check-in-yes');
 state.history[0]={...state.history[0],dueDate:'2026-11-10'};
 control.props.onPress();
 assert.equal(state.history[0].outcome,'yes');
 assert.equal(ritual.dayProgress(state.ritual,'2026-10-10').lit,0);
});

for(const scenario of [
 {dueDate:'2026-10-09',ready:false,banner:true},
 {dueDate:'2026-10-10',ready:true,banner:true},
 {dueDate:'2026-10-11',ready:false,banner:false},
 {dueDate:'2026-10-10',outcome:'yes',ready:false,banner:false},
 {dueDate:'2026-10-10',circleId:'circle',ready:false,banner:false},
])test(`Today check-in routing matches eligibility: ${JSON.stringify(scenario)}`,t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,12)});
 const {render}=app(true,[{...reading,...scenario}]);
 render().find(n=>n.props.testID==='tab-home').props.onPress();
 const home=render(),today=home.find(n=>n.type==='TodayCard');
 assert.equal(today.props.hint('ask'),scenario.ready?'A check-in is ready in History.':undefined);
 const banner=home.find(n=>n.props.label==='Your check-ins are ready');
 assert.equal(!!banner,scenario.banner);
 today.props.onStep('ask');
 assert.ok(render().some(n=>scenario.ready?n.props.testID==='tab-history'&&n.props.accessibilityState.selected:n.props.zoom===true));
 if(!scenario.ready)render().find(n=>n.props.testID==='close-flow').props.onPress();
 if(banner){
  render().find(n=>n.props.testID==='tab-home').props.onPress();
  render().find(n=>n.props.label==='Your check-ins are ready').props.onPress();
  assert.ok(render().some(n=>n.props.testID==='tab-history'&&n.props.accessibilityState.selected));
 }
});

test('Today questions opens The Ball asks without requiring AI consent',()=>{
 const {render}=app();
 render().find(n=>n.props.testID==='tab-home').props.onPress();
 render().find(n=>n.type==='TodayCard').props.onStep('questions');
 assert.ok(render().some(n=>n.type==='BallAsks'));
});
