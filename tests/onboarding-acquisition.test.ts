import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as heard from '../src/heard-from.ts';
import * as profile from '../src/profile.ts';
import {aboutYou} from '../src/ball-asks.ts';

function fixture(){
 const slots:any[]=[];let cursor=0;
 const h=(type:any,props:any,...children:any[])=>({type,props:props??{},children});
 const react={createElement:h,useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef:(initial:any)=>slots[cursor++]??={current:initial},useEffect:()=>{}};
 class Value{constructor(_n:number){}interpolate(){return 0}}
 const imports:Record<string,unknown>={react,'react-native':{Platform:{OS:'web'},Animated:{Value,View:'View'},Keyboard:{dismiss(){}}},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},'./heard-from':heard,'./profile':profile,'./ball-asks':{aboutYou},'./ui':{styles:{},fonts:{},colors:{}},'./motion':{},'./Surface':{},'react-native-svg':{}};
 const code=ts.transpileModule(readFileSync(new URL('../src/Onboarding.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};runInNewContext(code,{React:react,module,exports:module.exports,require:(name:string)=>imports[name]});
 const sent:string[]=[],finished:any[]=[];
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.Onboarding({reduce:true,onHeard:(source:string)=>sent.push(source),onFinish:(...args:any[])=>finished.push(args),onBlock:()=>{}}))};
 const press=(id:string)=>render().find(n=>n.props.testID===id).props.onPress();
 const finish=()=>{press('skip-for-now');press('confirm-age');press('about-done')};
 return {render,press,finish,sent,finished};
}

test('launch onboarding has four optional, deselectable sources and skips without reporting',()=>{
 const f=fixture();assert.deepEqual(f.render().filter(n=>n.props.accessibilityRole==='radio').map(n=>n.children[0].children[0].children[0]),['TikTok','Instagram','A friend','Other']);
 assert.ok(f.render().some(n=>n.children.includes('Where did you hear about Crystal Ball? Optional.')));
 f.press('heard-tiktok');assert.equal(f.render().find(n=>n.props.testID==='heard-tiktok').props['aria-checked'],true);
 f.press('heard-tiktok');f.finish();assert.deepEqual(f.sent,[]);assert.equal(f.finished.length,1);
 const skipped=fixture();skipped.finish();assert.deepEqual(skipped.sent,[]);assert.equal(skipped.finished.length,1);
});

test('source is reported only on eligible completion; Other preserves the existing tally format',()=>{
 for(const [id,source] of [['tiktok','TikTok'],['instagram','Instagram'],['a-friend','A friend'],['somewhere-else','Somewhere else']]){
  const f=fixture();f.press('heard-'+id);assert.deepEqual(f.sent,[]);f.finish();assert.deepEqual(f.sent,[source]);
 }
 assert.equal(heard.isHeardFrom('App Store'),true,'old clients remain accepted');
 assert.equal(heard.isHeardFrom('untrusted'),false);
});
