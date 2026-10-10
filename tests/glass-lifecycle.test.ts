import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as T from 'three';
import {startGlass} from '../src/glassBall';

const require=createRequire(import.meta.url);
function load(file:string,imports:Record<string,unknown>,globals:Record<string,unknown>={}){
 const module={exports:{} as any},localRequire=createRequire(new URL(file,import.meta.url));
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
 }).outputText;
 runInNewContext(code,{module,exports:module.exports,console,...globals,require:(name:string)=>name in imports?imports[name]:localRequire(name)});
 return module.exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const bytes=()=>new ArrayBuffer(256*256*4*6*2);
function frames(t:any){
 const callbacks=new Map<number,FrameRequestCallback>();let id=0;
 t.mock.method(globalThis,'requestAnimationFrame',(cb:FrameRequestCallback)=>{callbacks.set(++id,cb);return id});
 t.mock.method(globalThis,'cancelAnimationFrame',(id:number)=>{callbacks.delete(id)});
 return ()=>{const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(0))};
}
Object.assign(globalThis,{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});
class Renderer{
 debug={};draws=0;
 setClearColor(){} setPixelRatio(){} setSize(){} dispose(){} forceContextLoss(){}
 render(){this.draws++}
}

test('startup, queued frames and resume honor visibility; old cleanup preserves current drag',t=>{
 const step=frames(t),renderer=new Renderer();let hidden=true;
 const options={env:new T.CubeTexture(),motion:{reduce:false},aim:()=>[0,0,1],hidden:()=>hidden,load:async()=>new T.Texture()};
 const grip:any={dragged:false};
 const old=startGlass(renderer as any,options,grip);
 assert.equal(renderer.draws,0);
 hidden=false;old.resume();step();assert.equal(renderer.draws,1);
 hidden=true;step();assert.equal(renderer.draws,1);
 hidden=false;
 const current=startGlass(new Renderer() as any,{...options,env:new T.CubeTexture()},grip);
 old.stop();
 grip.grab({pointerId:1,clientX:0,clientY:0});
 grip.drag({pointerId:1,clientX:20,clientY:10});
 assert.equal(grip.dragged,true);
 current.stop();assert.equal(grip.grab,undefined);assert.equal(grip.drag,undefined);assert.equal(grip.release,undefined);
});

test('native startup waits for foreground and abort removes the foreground waiter',async t=>{
 frames(t);
 const listeners=new Set<(state:string)=>void>();
 const app={currentState:'active',addEventListener:(_:string,cb:(s:string)=>void)=>{listeners.add(cb);return {remove:()=>listeners.delete(cb)}}};
 const state=(value:string)=>{app.currentState=value;[...listeners].forEach(cb=>cb(value))};
 let finish!:(value:ArrayBuffer)=>void,created=0,presented=0;
 const asset=new Promise<ArrayBuffer>(resolve=>{finish=resolve});
 class NativeRenderer extends Renderer{constructor(){super();assert.equal(app.currentState,'active');created++}}
 const {startNativeGlass}=load('../src/glassNative.ts',{
  three:{...T,WebGLRenderer:NativeRenderer},'react-native':{AppState:app},
  'expo-asset':{Asset:{fromModule:()=>({downloadAsync:async()=>({localUri:'asset'})})}},
  'expo-file-system':{File:class{arrayBuffer(){return asset}}},'./roomAssets':{ballEnv:1},
 });
 const gl={pixelStorei(){},drawingBufferWidth:100,drawingBufferHeight:100,endFrameEXP(){assert.equal(app.currentState,'active');presented++}};
 const options={motion:{reduce:true},aim:()=>[0,0,1]};
 const controller=new AbortController();
 const pending=startNativeGlass(gl,{...options,signal:controller.signal});
 state('background');finish(bytes());await tick();assert.equal(created,0);assert.equal(listeners.size,1);
 controller.abort();assert.equal(await pending,null);assert.equal(listeners.size,0);
 const next=startNativeGlass(gl,{...options,signal:new AbortController().signal});
 await tick();state('inactive');await tick();assert.equal(created,0);
 state('active');const glass=await next;assert.equal(created,1);assert.equal(presented,1);
 state('background');glass.resume();assert.equal(presented,1);
 glass.stop();assert.equal(listeners.size,0);
});

test('web cancels obsolete asset continuations and preserves newer handlers on cleanup',async t=>{
 frames(t);
 let finish!:(value:ArrayBuffer)=>void,created=0;
 const asset=new Promise<ArrayBuffer>(resolve=>{finish=resolve});
 class WebRenderer extends Renderer{constructor(){super();created++}}
 const win=Object.assign(new EventTarget(),{devicePixelRatio:1});
 const doc=Object.assign(new EventTarget(),{hidden:false});
 const {startWebGlass}=load('../src/glassWeb.ts',{
  three:{...T,WebGLRenderer:WebRenderer},'expo-asset':{Asset:{fromModule:()=>({uri:'asset'})}},'./roomAssets':{ballEnv:1},
 },{window:win,document:doc,fetch:async()=>({ok:true,arrayBuffer:()=>asset})});
 const grip:any={dragged:false},options={motion:{reduce:true},aim:()=>[0,0,1]};
 const controller=new AbortController();
 const obsolete=startWebGlass({},100,{...options,signal:controller.signal},grip);
 controller.abort();
 const pending=startWebGlass({},100,{...options,signal:new AbortController().signal},grip);
 finish(bytes());assert.equal(await obsolete,null);
 const old=await pending;assert.equal(created,1);
 const current=await startWebGlass({},100,{...options,signal:new AbortController().signal},grip);
 old.stop();
 grip.grab({pointerId:1,clientX:0,clientY:0});
 win.dispatchEvent(Object.assign(new Event('pointermove'),{pointerId:1,clientX:15,clientY:10}));
 assert.equal(grip.dragged,true);
 current.stop();assert.equal(grip.grab,undefined);assert.equal(grip.drag,undefined);assert.equal(grip.release,undefined);
});

test('scene lifecycle plugin accepts repeat adoption and rejects unsupported delegates',async()=>{
 const plugin=require('../plugins/scene-lifecycle.js');
 const config=plugin({name:'test',slug:'test'});
 const source=`class AppDelegate: ExpoAppDelegate {
#if os(iOS) || os(tvOS)
 window = UIWindow(frame: UIScreen.main.bounds)
 factory.startReactNative()
#endif
}`;
 const apply=async(contents:string)=>(await config.mods.ios.appDelegate({modResults:{contents,language:'swift'},modRequest:{},modRawConfig:{}})).modResults.contents;
 const adopted=await apply(source);
 assert.notEqual(adopted,source);
 assert.equal(await apply(adopted),adopted);
 await assert.rejects(apply('class DifferentDelegate {}'),/template changed/);
 await assert.rejects(apply('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {\n window = UIWindow(frame: other)\n}'),/template changed/);
});
