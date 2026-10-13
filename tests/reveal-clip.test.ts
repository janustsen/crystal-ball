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
 const imports:Record<string,any>={react,'react-native':{Platform:{OS:'web'},Switch:'Switch',View:'View'},'expo-asset':{Asset:{fromModule:()=>({uri:'orb'})}},'./store':{useStore:()=>({state:{}})},'./Surface':{Surface:'Surface'},'./ui':{Action:'Action',Txt:'Txt',styles:{},colors:{},fonts:{}},'./delight':{selectedStyle:()=>'classic'}};
 const module={exports:{} as any},notices:string[]=[];
 runInNewContext(code,{React:react,module,exports:module.exports,require:(name:string)=>imports[name]??{},Image:class {decode(){return loading}}});
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
 const track={stop:()=>{},requestFrame:()=>{}},stream={addTrack:()=>{addedAudio++},getTracks:()=>[track],getVideoTracks:()=>[track]};
 const imports:Record<string,any>={react,'react-native':{Platform:{OS:'web'},Switch:'Switch',View:'View'},'expo-asset':{Asset:{fromModule:()=>({uri:'asset'})}},'./store':{useStore:()=>({state:{}})},'./Surface':{Surface:'Surface'},'./ui':{Action:'Action',Txt:'Txt',styles:{},colors:{},fonts:{}},'./delight':{selectedStyle:()=>'classic'},'./social-policy':{activityTheme:()=>'learning',skyPrompts:{learning:{label:'Learning'}}},'./retention':{suggestedCheckIn:()=>'2026-12-01'}};
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
  requestData(){}
  stop(){this.ondataavailable({data:new Blob(['video'])});this.onstop()}
 }
 const module={exports:{} as any};
 runInNewContext(code,{React:react,module,exports:module.exports,require:(name:string)=>imports[name]??{},Error,Blob,File,AudioContext:Audio,MediaRecorder:Recorder,Image:class {async decode(){}},
  fetch:async()=>{if(mode==='audio fetch failure')throw new Error('fetch failed');return {arrayBuffer:async()=>new ArrayBuffer(0)}},
  performance:{now:()=>clock},setTimeout:(callback:()=>void,delay:number)=>{if(delay<10000)queueMicrotask(()=>{clock+=delay;callback()});return 0},
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

test('reveal clips paint the ground, the ball\'s light and the glass card, with AI glass inside the ball and the opening fade; Classic keeps the base orb',()=>{
 const code=ts.transpileModule(readFileSync(new URL('../src/RevealClip.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
 }).outputText;
 const module={exports:{} as typeof import('../src/RevealClip')};
 const imports:Record<string,unknown>={
  react:{},'react/jsx-runtime':{},'react-native':{},'expo-asset':{},
  './ui':{colors:{},fonts:{}},'./retention':{suggestedCheckIn:()=>'December 1'},
  './delight':{},'./roomAssets':{},'./social-policy':{},'./store':{},
 };
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{
  assert.ok(name in imports,`Unexpected import: ${name}`);return imports[name];
 }});
 const orb={} as HTMLImageElement,glass={} as HTMLImageElement;
 for(const ballStyle of ['aurora','classic'] as const)for(const open of [1,.5])for(const golden of [false,true]){
  const calls:unknown[][]=[];
  const ctx={
   globalAlpha:1,
   globalCompositeOperation:'source-over',
   createRadialGradient(){calls.push(['gradient']);return {addColorStop:()=>{}}},
   fillRect(...args:number[]){calls.push(['fillRect',...args])},fill(){calls.push(['fill'])},stroke(){calls.push(['stroke'])},moveTo(){},lineTo(){},arcTo(){},closePath(){},fillText(text:string){calls.push(['text',text])},
   measureText:()=>({width:100}),
   save(){calls.push(['save'])},restore(){calls.push(['restore'])},
   beginPath(){calls.push(['beginPath'])},arc(...args:number[]){calls.push(['arc',...args])},
   clip(){calls.push(['clip'])},
   drawImage(image:HTMLImageElement,...args:number[]){calls.push(['drawImage',image,...args,this.globalAlpha])},
  };
  module.exports.paintStory(ctx as unknown as CanvasRenderingContext2D,
   {headline:'You will finish your course.',golden} as Parameters<typeof module.exports.paintStory>[1],
   {cardStyle:'classic',golden:false,ballStyle,orb,glass},{orb:open});
  const text=calls.filter(call=>call[0]==='text').map(call=>call[1]).join(' ');
  assert.doesNotMatch(text,/speculative forecast|not a guarantee/i);
  assert.match(text,/You will finish your course\./);
  assert.match(text,/Check back December 1/);
  assert.equal(text.includes('Golden edition'),golden);
  // No artwork behind the ball: the ground fills the frame, then the light and the card, before any image.
  assert.deepEqual(calls[0],['fillRect',0,0,1080,1920]);
  const firstImage=calls.findIndex(call=>call[0]==='drawImage');
  assert.ok(['gradient','fill','stroke'].every(op=>calls.findIndex(call=>call[0]===op)<firstImage));
  assert.equal(calls[firstImage][1],orb);
  const scale=.86+.14*open;
  assert.equal(calls.filter(call=>call[0]==='drawImage'&&call[1]===orb).length,1);
  if(ballStyle==='aurora'){
   const start=calls.findIndex(call=>call[0]==='save');
   assert.deepEqual(calls.slice(start,start+6),[
    ['save'],['beginPath'],['arc',540,550,270*scale,0,Math.PI*2],['clip'],
    ['drawImage',glass,540-270*scale,550-270*scale,540*scale,540*scale,open],['restore'],
   ]);
  }else{
   assert.equal(calls.some(call=>call[0]==='drawImage'&&call[1]===glass),false);
   assert.equal(calls.some(call=>call[0]==='clip'),false);
  }
  assert.equal(ctx.globalAlpha,1);
 }
});

test('a look loads only the ball and its AI glass; Classic needs no glass',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../src/RevealClip.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{} as typeof import('../src/RevealClip')},requested:string[]=[];
 const imports:Record<string,unknown>={react:{},'react/jsx-runtime':{},'react-native':{},'expo-asset':{Asset:{fromModule:(uri:string)=>({uri})}},
  './ui':{colors:{},fonts:{}},'./retention':{},'./delight':{},'./roomAssets':{ballArt:{aurora:{glass:'aurora-glass.jpg'}}},'./social-policy':{},'./store':{},
  '../assets/orb.png':'orb.png'};
 class Loaded{src='';decode(){requested.push(this.src);return Promise.resolve()}}
 runInNewContext(code,{module,exports:module.exports,Image:Loaded,Promise,require:(name:string)=>{assert.ok(name in imports,`Unexpected import: ${name}`);return imports[name]}});
 const classic=await module.exports.loadLook('gold','classic');
 assert.equal(classic.glass,undefined);
 assert.deepEqual(requested,['orb.png']);
 const aurora=await module.exports.loadLook('obsidian','aurora',true);
 assert.deepEqual([aurora.cardStyle,aurora.golden],['obsidian',true]);
 assert.deepEqual(requested.slice(1).sort(),['aurora-glass.jpg','orb.png']);
});

test('export labels shrink until they fit their band with letter spacing included, as a receipt with both dates needs',async()=>{
 const {receiptCard}=await import('../src/story-card.ts');
 const card=receiptCard({id:'0000000a-abcd-4000-8000-000000000000',question:'Will I learn to paint this year?',headline:'You will finish your course within 2 months.',createdAt:'2026-10-01T12:00:00.000Z',checkedInAt:'2026-10-21',outcome:'yes',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false})!;
 const code=ts.transpileModule(readFileSync(new URL('../src/RevealClip.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{} as typeof import('../src/RevealClip')};
 const imports:Record<string,unknown>={react:{},'react/jsx-runtime':{},'react-native':{},'expo-asset':{},'./ui':{colors:{},fonts:{}},'./retention':{},'./delight':{},'./roomAssets':{},'./social-policy':{},'./store':{}};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]});
 // A canvas whose glyph widths scale with the font size and, like the browser, add the current letter spacing per character.
 const drawn:{text:string;width:number}[]=[];
 const ctx={font:'',fillStyle:'',letterSpacing:'0px',
  measureText(text:string){return {width:text.length*(parseFloat(this.font)*.55+parseFloat(this.letterSpacing))}},
  fillText(text:string){drawn.push({text,width:this.measureText(text).width})}};
 for(const label of card.labels)module.exports.paintLabel(ctx as unknown as CanvasRenderingContext2D,label,1400,'gold',32,760);
 assert.ok(card.labels[1].includes('opened'));
 assert.equal(drawn.length,2);
 for(const {width} of drawn)assert.ok(width<=760,`label drawn ${width.toFixed(0)}px wide in a 760px band`);
 assert.equal(ctx.letterSpacing,'0px');
});
