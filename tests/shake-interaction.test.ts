import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as motion from '../src/motion';

function shakeComponent(platform:'native'|'web'){
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,starts=0,stops=0,position=0;
 const react={
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void|(()=>void),deps:any[])=>{
   const i=cursor++,previous=slots[i];
   if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j]))){
    effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:effect()}});
   }
  },
 };
 const element={animate:()=>{starts++;position=motion.shake.x[1];return {cancel:()=>{stops++;position=0}}}};
 const jsx=(type:any,props:any)=>{if(props.ref)props.ref.current=element;return {type,props}};
 const native={
  Animated:{
   View:'View',
   Value:class {
    setValue(value:number){position=value}
    interpolate(){return null}
   },
   timing:()=>({start:()=>{starts++;position=motion.shake.x[1]},stop:()=>{stops++}}),
  },
  Easing:{linear:()=>{}},
 };
 const file=platform==='web'?'../src/Enter.web.tsx':'../src/Enter.tsx';
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
 }).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='react-native')return native;
  if(name==='./motion')return motion;
  throw new Error(`Unexpected import: ${name}`);
 }});
 const child={type:'input'};
 return {
  render(trigger:number,reduce=false){
   cursor=0;
   const tree=module.exports.Shake({trigger,reduce,children:child});
   effects.splice(0).forEach(effect=>effect());
   assert.equal(tree.props.children,child);
  },
  state:()=>({starts,stops,position}),
  // The web entrance's CSS animation name after one render; `none` holds it still.
  enter(reduce:boolean){cursor=0;return module.exports.Enter({kind:'count',reduce,children:child}).props.style.animationName},
 };
}

test('web entrances never replay once reduced motion has held them still',()=>{
 const moving=shakeComponent('web');
 assert.equal(moving.enter(false),undefined);
 assert.equal(moving.enter(false),undefined);
 const held=shakeComponent('web');
 assert.equal(held.enter(true),'none');
 // Lifting the preference would otherwise restart the finished (or suppressed) entrance.
 assert.equal(held.enter(false),'none');
 const lifted=shakeComponent('web');
 assert.equal(lifted.enter(false),undefined);
 assert.equal(lifted.enter(true),'none');
 assert.equal(lifted.enter(false),'none');
});

for(const platform of ['native','web'] as const){
 test(`${platform} consumes suppressed shake triggers without replaying them`,()=>{
  const shake=shakeComponent(platform);
  shake.render(7,true);
  shake.render(8,true);
  shake.render(9,true);
  shake.render(9,false);
  assert.equal(shake.state().starts,0);
  shake.render(10);
  assert.equal(shake.state().starts,1);
  shake.render(10);
  assert.equal(shake.state().starts,1);
  shake.render(11);
  assert.equal(shake.state().starts,2);
  shake.render(7);
  assert.equal(shake.state().starts,3);
 });

 test(`${platform} cancels an active shake and restores rest when motion is reduced`,()=>{
  const shake=shakeComponent(platform);
  shake.render(0);
  assert.equal(shake.state().starts,0);
  shake.render(1);
  assert.notEqual(shake.state().position,0);
  shake.render(1,true);
  assert.deepEqual(shake.state(),{starts:1,stops:1,position:0});
  shake.render(1,false);
  assert.deepEqual(shake.state(),{starts:1,stops:1,position:0});
  shake.render(2);
  assert.equal(shake.state().starts,2);
  shake.render(3,true);
  shake.render(3,false);
  assert.deepEqual(shake.state(),{starts:2,stops:2,position:0});
 });
}
