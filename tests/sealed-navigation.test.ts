import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as retention from '../src/retention';
import {circleReading} from '../src/reading-history';
import {canRead} from '../src/profile';

const code=ts.transpileModule(readFileSync(new URL('../app/index.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;

function app(onboardingDone=true,history:any[]=[]){
 const params:{seal?:string;social?:string}={seal:'sealed-receipt'},slots:any[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:()=>{},useLayoutEffect:()=>{},useCallback:(callback:any)=>callback,
 };
 const state={onboardingDone,ageConfirmed:true,facts:{},history,usage:{day:'2026-10-03',count:0},credits:0,plus:false,reduceMotion:true};
 const imports:Record<string,any>={
  '../src/retention':retention,react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844,width:390})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining:1})},
  '../src/ui':{colors:{},fonts:{},styles:{}},
  '../src/profile':{canRead},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:()=>({friend:false})},
  '../src/SocialScreen':{SealedCard:'SealedCard',Social:'Social'},
  '../src/Onboarding':{Onboarding:'Onboarding'},'../src/native':{haptic:()=>{}},
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{}});
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
  if(destination==='plans')assert.ok(next.some(n=>n.props.testID==='continue-with-plus-simulate'));
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
 render().find(n=>n.props.testID==='reading-more').props.onPress();
 assert.ok(!render().some(n=>n.props.testID==='remind-me-to-check-back'));
 render().find(n=>n.props.label==='Open Circle check-in').props.onPress();
 assert.equal(params.social,'circles');assert.ok(render().some(n=>n.type==='Social'));
 assert.equal(retention.personalCheckInDue({...reading,circleId:undefined}),true);
 assert.equal(retention.checkInLabel({...reading,circleId:undefined}),'Ready to check in');
});
