import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('recording locks the question setting until recording completes or fails',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../src/RevealClip.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const slots:any[]=[];let cursor=0,reject!:(error:Error)=>void;
 const loading=new Promise<void>((_resolve,fail)=>{reject=fail});
 const react={createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]}};
 const imports:Record<string,any>={react,'react-native':{Platform:{OS:'web'},Switch:'Switch',View:'View'},'expo-asset':{Asset:{fromModule:()=>({uri:'orb'})}},'./store':{useStore:()=>({state:{}})},'./ui':{Action:'Action',Txt:'Txt',styles:{},colors:{},fonts:{}}};
 const module={exports:{} as any},notices:string[]=[];
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{},Image:class {decode(){return loading}}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.RevealClip({prediction:{question:'Private question'},onNotice:(text:string)=>notices.push(text)}))};
 const control=(id:string)=>render().find(n=>n.props.testID===id).props;
 control('clip-question').onValueChange(true);
 control('make-reveal-clip').onPress();
 assert.equal(control('clip-question').value,true);
 assert.equal(control('clip-question').disabled,true);
 assert.equal(control('make-reveal-clip').disabled,true);
 assert.ok(!render().some(n=>n.props.testID==='save-reveal-clip'));
 reject(new Error('failed'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(control('clip-question').disabled,false);
 control('clip-question').onValueChange(false);
 assert.equal(control('clip-question').value,false);
 assert.ok(notices.some(text=>text.includes('could not be recorded')));
});

for(const mode of ['share','download','expired activation','cancel','audio fetch failure','audio decode failure'])test(`one tap clip export: ${mode}`,async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../src/RevealClip.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const slots:any[]=[],notices:string[]=[],shared:any[]=[],downloaded:string[]=[];
 let cursor=0,recordings=0,closed=0,clock=0,addedAudio=0;
 const react={createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]}};
 const ctx=new Proxy({},{get:(_target,key)=>key==='measureText'?()=>({width:10}):key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
 const track={stop:()=>{}},stream={addTrack:()=>{addedAudio++},getTracks:()=>[track]};
 const imports:Record<string,any>={react,'react-native':{Platform:{OS:'web'},Switch:'Switch',View:'View'},'expo-asset':{Asset:{fromModule:()=>({uri:'asset'})}},'./store':{useStore:()=>({state:{}})},'./ui':{Action:'Action',Txt:'Txt',styles:{},colors:{},fonts:{}},'./delight':{selectedStyle:()=>'classic'},'./social-policy':{activityTheme:()=>'learning',skyPrompts:{learning:{label:'Learning'}}},'./retention':{suggestedCheckIn:()=>'2026-12-01'}};
 class Audio{
  currentTime=0;
  async resume(){}
  async close(){closed++}
  createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[track]}}}
  async decodeAudioData(){if(mode==='audio decode failure')throw new Error('decode failed');return {}}
  createBufferSource(){return {connect:(value:any)=>value,start:()=>{},stop:()=>{}}}
  createGain(){return {gain:{value:0},connect:(value:any)=>value}}
 }
 class Recorder{
  static isTypeSupported(){return true}
  onstop=()=>{};ondataavailable=(_event:any)=>{};
  start(){recordings++}
  stop(){this.ondataavailable({data:new Blob(['video'])});this.onstop()}
 }
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{},Error,Blob,File,AudioContext:Audio,MediaRecorder:Recorder,Image:class {async decode(){}},
  fetch:async()=>{if(mode==='audio fetch failure')throw new Error('fetch failed');return {arrayBuffer:async()=>new ArrayBuffer(0)}},
  performance:{now:()=>clock},requestAnimationFrame:(callback:()=>void)=>{clock+=8000;callback()},setTimeout:()=>0,
  URL:{createObjectURL:()=> 'blob:clip',revokeObjectURL:()=>{}},
  document:{createElement:(tag:string)=>tag==='canvas'?{getContext:()=>ctx,captureStream:()=>stream}:{click(){downloaded.push('clip')}}},
  navigator:{canShare:()=>mode!=='download',share:async(value:any)=>{shared.push(value);if(mode==='expired activation')throw new Error('activation expired');if(mode==='cancel')throw Object.assign(new Error('canceled'),{name:'AbortError'})}},
 });
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.RevealClip({prediction:{question:'Private question',headline:'You will learn.'},onNotice:(text:string)=>notices.push(text)}))};
 render().find(n=>n.props.testID==='make-reveal-clip').props.onPress();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(closed,1);
 assert.equal(render().find(n=>n.props.testID==='make-reveal-clip').props.disabled,false);
 if(mode.startsWith('audio')){
  assert.equal(recordings,0);assert.equal(shared.length,0);assert.equal(downloaded.length,0);
  assert.ok(notices.some(text=>text.includes('could not be recorded')));
 }else{
  assert.equal(recordings,1);assert.equal(addedAudio,1);
  assert.equal(shared.length,mode==='download'?0:1);
  if(shared.length)assert.equal(shared[0].files[0].type,'video/mp4');
  assert.equal(downloaded.length,mode==='download'||mode==='expired activation'?1:0);
 }
});
