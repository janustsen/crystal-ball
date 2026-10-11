import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as room from '../src/room';

function component(file:string,imports:Record<string,any>,globals:Record<string,any>={}){
 const slots:any[]=[],effects:(()=>void)[]=[],cleanups:any[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>{
   if(props?.ref)props.ref.current={closest:()=>null,play:async()=>{}};
   return {type,props:props??{},children};
  },
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{
   const i=cursor++,previous=slots[i];
   if(!previous||deps.some((value,j)=>value!==previous[j]))effects.push(()=>{cleanups[i]?.();cleanups[i]=effect()});
   slots[i]=deps;
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
 }).outputText;
 const jsx=(type:any,props:any)=>react.createElement(type,props,...[props.children??[]].flat());
 runInNewContext(code,{module,exports:module.exports,AbortController,...globals,console:{error:()=>{},warn:()=>{}},require:(name:string)=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name in imports)return imports[name];
  throw new Error(`Unexpected import: ${name}`);
 }});
 return (name:string,props:any)=>{
  const render=()=>{cursor=0;return module.exports[name](props)};
  render();effects.splice(0).forEach(effect=>effect());return render();
 };
}
const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...(node.children??[]).flatMap(nodes)];

test('room cover maps the tracked ball onto any screen and docks content below each spot',()=>{
 const phone=room.ballOnScreen(room.stillFrame('Home'),390,844)!;
 assert.ok(Math.abs(phone.x-175.2)<.1&&Math.abs(phone.y-559.7)<.1&&Math.abs(phone.r-18.7)<.1);
 // A wider shell crops the render's sides instead of letterboxing, so the ball keeps its place on the desk.
 const wide=room.ballOnScreen(room.stillFrame('Home'),600,844)!,cover=room.roomCover(600,844);
 assert.equal(cover.scale,600/1170);
 assert.equal(wide.x,cover.x+525.5*cover.scale);
 assert.equal(room.ballOnScreen(room.stillFrame('Sky'),390,844),null);
 assert.equal(room.contentTop('Home',390,844),Math.round(phone.y+phone.r+16));
 assert.equal(room.contentTop('Sky',390,844),Math.round(844*.48));
 // Every ordered pair has a flight, and every flight starts and ends on its spots' stills.
 const spots=['Home','Sky','Ask','History','You'] as const;
 for(const from of spots)for(const to of spots){
  if(from===to)continue;
  const frames=room.clipFrames(room.flightKey(from,to));
  assert.equal(frames.length,45);
  assert.deepEqual(frames[0].slice(0,3),room.stillFrame(from).slice(0,3));
  assert.deepEqual(frames.at(-1)!.slice(0,3),room.stillFrame(to).slice(0,3));
 }
 assert.ok(room.maxBallRadius>=room.stillFrame('Ask')[2]);
});

test('room asset build turns a camera frame into ball position, view direction and depth-of-field blur',async()=>{
 const {trackFrame}=await import('../scripts/room-assets.mjs');
 const base={cam_location:[0,0,0],hfov_deg:50,fstop:8,flicker:.02,ball_px:[525.51,1679.23],ball_radius_px:56.12,ball_in_frame:true};
 const sharp=trackFrame({...base,focus_m:2,ball_depth_m:2},[0,0,-2],1170);
 assert.deepEqual(sharp,[525.5,1679.2,56.1,0,0,1,0,.02]);
 const soft=trackFrame({...base,hfov_deg:38,fstop:2.8,focus_m:.87,ball_depth_m:1.62},[0,0,-2],1170);
 assert.ok(soft[6]>4&&soft[6]<8);
 assert.deepEqual(trackFrame({...base,ball_in_frame:false},[0,0,-2],1170),[0,0,0,0,0,1,0,0]);
});

test('room Home fallback stays aligned across resize and reduced motion',async()=>{
 let attempts=0;
 const render=component('../src/RoomScene.web.tsx',{
  './glassWeb':{startWebGlass:async()=>{attempts++;throw new Error('WebGL unavailable')}},
  'expo-asset':{Asset:{fromModule:(m:string)=>({uri:`asset:${m}`})}},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './room':room,'./roomAssets':{roomStills:{Home:'home.jpg',Sky:'sky.jpg'},homeIdle:'home-idle.mp4'},'./motionCss':{appCss:'app-css'},
 },{setTimeout:()=>0});
 const spin={dragged:false};
 for(const reduce of [false,true])for(const [width,height] of [[390,844],[375,667],[600,844]]){
  const props={spot:'Home',width,height,reduce,spin};
  render('RoomScene',props);await new Promise(resolve=>setImmediate(resolve));
  const tree=nodes(render('RoomScene',props)),orb=tree.find(n=>n.type==='OrbVisual'),ball=room.ballOnScreen(room.stillFrame('Home'),props.width,props.height)!;
  assert.ok(orb);
  const box=tree.find(n=>n.children.includes(orb)).props.style;
  assert.equal(box.left,ball.x-ball.r);assert.equal(box.top,ball.y-ball.r);assert.equal(orb.props.size,ball.r*2);
  assert.ok(tree.some(n=>n.type==='img'&&n.props.src==='asset:home.jpg'));
  const image=tree.find(n=>n.type==='img'),cover=room.roomCover(width,height);
  assert.equal(image.props.style.objectFit,'cover');
  assert.equal(image.props.style.width,'100%');
  assert.equal(image.props.style.height,'100%');
  assert.equal(box.left+orb.props.size/2,cover.x+525.5*cover.scale);
  assert.equal(box.top+orb.props.size/2,cover.y+1679.2*cover.scale);
  assert.equal(tree[0].props.style.pointerEvents,'none');
  // The room is the shell's backdrop, so it carries the shared stylesheet (entrances, reduced motion, focus rings).
  assert.ok(tree.some(n=>n.type==='style'&&n.children.includes('app-css')));
 }
 assert.equal(attempts,6);
 const sky=component('../src/RoomScene.web.tsx',{
  './glassWeb':{startWebGlass:async()=>{throw new Error('WebGL unavailable')}},
  'expo-asset':{Asset:{fromModule:(m:string)=>({uri:`asset:${m}`})}},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './room':room,'./roomAssets':{roomStills:{Home:'home.jpg',Sky:'sky.jpg'},homeIdle:'home-idle.mp4'},'./motionCss':{appCss:'app-css'},
 },{setTimeout:()=>0});
 assert.ok(!nodes(sky('RoomScene',{spot:'Sky',width:390,height:844,reduce:true,spin})).some(n=>n.type==='OrbVisual'));
});

test('web room keeps loading and failed glass aligned with stills across navigation and resize',async()=>{
 const pending:{resolve:(glass:any)=>void;reject:(error:Error)=>void;signal:AbortSignal}[]=[];
 const timers:(()=>void)[]=[];
 const render=component('../src/RoomScene.web.tsx',{
  './glassWeb':{startWebGlass:(_:unknown,__:number,{signal}:{signal:AbortSignal})=>new Promise((resolve,reject)=>pending.push({resolve,reject,signal}))},
  'expo-asset':{Asset:{fromModule:(m:string)=>({uri:`asset:${m}`})}},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './room':{...room,roomAssetBase:'room'},
  './roomAssets':{roomStills:Object.fromEntries(['Home','Sky','Ask','History','You','Library'].map(s=>[s,`${s}.jpg`])),roomFlights:{},homeIdle:'idle.mp4',ballArt:{}},
  './motionCss':{appCss:''},
 },{
  fetch:async()=>({ok:true,blob:async()=>({})}),URL:{createObjectURL:()=>`clip:${Math.random()}`},
  setTimeout:(fn:()=>void)=>{timers.push(fn);return timers.length},clearTimeout:()=>{},
 });
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const props={spot:'Home',width:390,height:844,reduce:false,spin:{dragged:false}};
 const draw=()=>nodes(render('RoomScene',props));
 const aligned=()=>{
  const tree=draw(),placed=room.ballOnScreen(room.stillFrame(props.spot as room.Spot),props.width,props.height);
  const orb=tree.find(n=>n.type==='OrbVisual');
  assert.equal(Boolean(orb),Boolean(placed));
  if(placed){
   const box=tree.find(n=>n.children.includes(orb)).props.style;
   assert.equal(box.left,placed.x-placed.r);assert.equal(box.top,placed.y-placed.r);
   assert.equal(orb.props.size,placed.r*2);
  }
  assert.ok(tree.some(n=>n.type==='img'&&n.props.src===`asset:${props.spot}.jpg`));
  assert.ok(!tree.some(n=>n.type==='video'||n.props['data-room-fade']!==undefined));
 };
 aligned();timers.shift()!();await tick();
 for(const reduce of [false,true])for(const spot of ['Ask','Sky','History','You','Library','Home']){
  Object.assign(props,{spot,reduce});aligned();
 }
 props.reduce=false;
 pending[0].resolve({stop(){},style(){},resume(){}});await tick();
 let tree=draw();
 assert.ok(!tree.some(n=>n.type==='OrbVisual'));
 assert.ok(tree.some(n=>n.type==='video'&&n.props.loop),'ready glass enables the idle clip');
 props.spot='Ask';tree=draw();
 assert.ok(tree.some(n=>n.type==='video'&&!n.props.loop),'ready glass enables flights');
 props.width=375;aligned();
 assert.equal(pending[0].signal.aborted,true);
 props.height=667;aligned();
 let stopped=false;
 pending[1].resolve({stop(){stopped=true},style(){},resume(){}});await tick();aligned();
 assert.equal(stopped,true,'obsolete startup cannot remove the current fallback');
 pending[2].reject(new Error('unavailable'));await tick();aligned();
});

function nativeRoom(startNativeGlass:()=>Promise<unknown>){
 const listeners:Record<string,(e?:any)=>void>={},fades:number[]=[],played:unknown[]=[],positions:number[]=[],durations:number[]=[];
 const player={currentTime:0,muted:false,audioMixingMode:'',replaceAsync:async(clip:unknown)=>{played.push(clip)},play(){},pause(){},
  addListener:(name:string,fn:(e?:any)=>void)=>{listeners[name]=fn;return {remove(){}}}};
 const render=component('../src/RoomScene.tsx',{
  'react-native':{Animated:{Value:class {setValue(value:number){positions.push(value)}stopAnimation(){}interpolate(){return 'tracked'}},timing:(_:unknown,{toValue,duration}:{toValue:number;duration:number})=>({start(){fades.push(toValue);durations.push(duration)}}),Image:'Animated.Image',View:'Animated.View'},Easing:{linear:'linear'},Image:'Image',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'expo-gl':{GLView:'GLView'},'./OrbVisual':{OrbVisual:'OrbVisual'},
  'expo-video':{useVideoPlayer:(_:unknown,setup:(p:typeof player)=>void)=>{setup(player);return player},VideoView:'VideoView'},
  './room':room,'./roomAssets':{roomStills:Object.fromEntries(['Home','Sky','Ask','History','You','Library'].map(s=>[s,`${s}.jpg`])),roomFlights:{'home-ask':'home-ask.mp4'},ballArt:{}},
  './glassNative':{startNativeGlass},
 },{setTimeout:()=>0,clearTimeout:()=>{}});
 return {render,listeners,fades,played,player,positions,durations};
}

test('native room flies the camera to the new spot and lands on its still',async()=>{
 let aim!:()=>unknown;
 const {render,listeners,fades,played,player,positions,durations}=nativeRoom((...args:any[])=>{aim=args[1].aim;return new Promise(()=>{})});
 let playbackChanges=0;
 const tick=()=>new Promise(r=>setImmediate(r));
 const props={spot:'Home',width:390,height:844,reduce:false,spin:{dragged:false},onPlaybackChange:()=>{playbackChanges++}};
 const draw=()=>nodes(render('RoomScene',props));
 const stills=()=>draw().filter(n=>n.type==='Image').map(n=>n.props.source);
 draw().find(n=>n.type==='GLView').props.onContextCreate({});
 assert.equal(player.muted,true);
 props.spot='Ask';draw();await tick();
 assert.deepEqual(played,['home-ask.mp4']);
 // Until the clip plays, the start still covers the decoded destination and the video stays hidden.
 assert.deepEqual(stills(),['Ask.jpg','Home.jpg']);
 assert.equal(draw().find(n=>n.type==='VideoView').props.style.opacity,0);
 listeners.playingChange({isPlaying:true});
 let tree=draw();
 assert.equal(tree.find(n=>n.type==='VideoView').props.style.opacity,1);
 assert.equal(tree.find(n=>n.type==='Animated.View').props.style.transform[0].translateX,'tracked','the ball rides the flight track');
 assert.deepEqual(fades,[44],'the track runs over the clip\'s 45 frames');
 assert.equal(tree.find(n=>n.type==='GLView').props.style.opacity,0,'the static orb rides the flight');
 assert.ok(tree.some(n=>n.type==='OrbVisual'));
 player.currentTime=.7;
 listeners.playingChange({isPlaying:false});
 assert.deepEqual(stills(),['Ask.jpg','Home.jpg']);
 listeners.playingChange({isPlaying:true});
 assert.deepEqual(fades,[44,44]);
 assert.equal(positions.at(-1),21);
 assert.equal(durations.at(-1),23/room.roomFps*1000);
 assert.deepEqual(JSON.parse(JSON.stringify(aim())),room.ballOnScreen(room.clipFrames('home-ask')[21],390,844)!.dir);
 player.currentTime=1;
 assert.deepEqual(JSON.parse(JSON.stringify(aim())),room.ballOnScreen(room.clipFrames('home-ask')[30],390,844)!.dir);
 assert.equal(playbackChanges,3);
 listeners.playToEnd();
 tree=draw();
 assert.deepEqual(stills(),['Ask.jpg']);
 assert.equal(tree.find(n=>n.type==='VideoView').props.style.opacity,0);
 // Reduced motion (and spot pairs without a clip) cross-fade the stills instead of flying.
 Object.assign(props,{spot:'Home',reduce:true});draw();
 assert.deepEqual(played,['home-ask.mp4']);
 assert.equal(fades.at(-1),0);
 assert.ok(draw().some(n=>n.type==='Animated.Image'&&n.props.source==='Ask.jpg'));
});

test('native room keeps the static orb on the stand until the live glass has started',async()=>{
 let resolve!:(glass:unknown)=>void;
 const {render}=nativeRoom(()=>new Promise(r=>{resolve=r}));
 const props={spot:'Home',width:390,height:844,reduce:false,spin:{dragged:false}};
 const ball=room.ballOnScreen(room.stillFrame('Home'),390,844)!;
 let tree=nodes(render('RoomScene',props));
 const orb=tree.find(n=>n.type==='OrbVisual'),gl=tree.find(n=>n.type==='GLView');
 assert.ok(orb,'the static orb rests on the stand while the glass starts');
 assert.equal(orb.props.size,ball.r*2);
 assert.equal(gl.props.style.opacity,0);
 gl.props.onContextCreate({});
 resolve({stop(){},style(){},resume(){}});await new Promise(r=>setImmediate(r));
 tree=nodes(render('RoomScene',props));
 assert.ok(!tree.some(n=>n.type==='OrbVisual'),'the live glass replaces the static orb');
 assert.equal(tree.find(n=>n.type==='GLView').props.style.opacity,1);
});

test('the room ball supplies touch feedback before reading, and a drag spins it instead',()=>{
 const events:string[]=[],Platform={OS:'web'};
 const render=component('../src/Home.tsx',{
  'react-native':{Platform,Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'react-native-svg':{SvgXml:'SvgXml'},
  './Surface':{Surface:'Surface'},'./Enter':{Enter:'Enter'},'./AskOrb':{AskOrb:'AskOrb'},'./ui':{Txt:'Txt',fonts:{},colors:{},styles:{}},'./store':{useStore:()=>({state:{}})},
  './delight':{selectedStyle:()=>'classic'},
  './native':{haptic:(kind:string)=>events.push(kind)},
 });
 const spin:any={dragged:false};
 const ball=render('BallButton',{x:175,y:560,r:18.7,home:true,spin,onPress:()=>events.push('ask')});
 assert.equal(ball.props.testID,'hero-orb');
 // A small ball still gets a 44 px target.
 assert.equal(ball.props.style.width,44);assert.equal(ball.props.style.left,175-22);
 ball.props.onPressIn();assert.deepEqual(events,['touch']);
 ball.props.onPress();assert.deepEqual(events,['touch','ask']);
 spin.grab=(e:PointerEvent)=>{events.push(`grab ${e.pointerId}`);spin.dragged=true};
 ball.props.onPointerDown({nativeEvent:{pointerId:4}});
 ball.props.onPress();assert.deepEqual(events,['touch','ask','grab 4']);
 ball.props.onPress();assert.deepEqual(events,['touch','ask','grab 4','ask']);
 // At Ask the ball only spins until the question is ready.
 const ask=render('BallButton',{x:195,y:422,r:58,home:false,spin});
 assert.equal(ask.props.testID,'ask-ball');assert.equal(ask.props.style.width,116);
 ask.props.onPress();assert.deepEqual(events,['touch','ask','grab 4','ask']);
 // Native forwards each touch to the scene: down grabs, moves drag, lifting releases.
 Platform.OS='ios';events.length=0;
 const touch=(id:number,x:number)=>({nativeEvent:{changedTouches:[{identifier:id,pageX:x,pageY:500}]}});
 Object.assign(spin,{grab:(e:any)=>events.push(`grab ${e.pointerId} ${e.clientX}`),drag:(e:any)=>events.push(`drag ${e.pointerId} ${e.clientX}`),release:(e:any)=>events.push(`release ${e.pointerId}`)});
 const native=render('BallButton',{x:175,y:560,r:18.7,home:true,spin});
 assert.equal(native.props.onPointerDown,undefined);
 native.props.onTouchStart(touch(3,170));native.props.onTouchMove(touch(3,190));native.props.onTouchEnd(touch(3,190));native.props.onTouchCancel(touch(5,0));
 assert.deepEqual(events,['grab 3 170','drag 3 190','release 3','release 5']);
});


test('native audio resets yield to listening across playback changes and pending timers',async()=>{
 const timers=new Map<number,()=>void>();let nextTimer=0,resets=0;
 const sound={play(){},pause(){},seekTo:async()=>{}};
 const render=component('../src/useDelight.ts',{
  'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  'expo-audio':{useAudioPlayer:()=>sound,setAudioModeAsync:async()=>{resets++}},
  './native':{haptic(){}},'./motion':{motion:{}},
  '../assets/audio/hum.wav':0,'../assets/audio/chime.wav':1,
 },{
  setTimeout:(fn:()=>void)=>{timers.set(++nextTimer,fn);return nextTimer},
  clearTimeout:(id:number)=>timers.delete(id),
 });
 const props={enabled:true,thinking:false,listening:false};
 const draw=()=>render('useDelight',props) as ()=>void;
 const flush=async()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());await new Promise(r=>setImmediate(r))};
 let changed=draw();await flush();assert.equal(resets,1);
 changed();changed=draw();
 props.listening=true;changed=draw();
 await flush();assert.equal(resets,1);
 for(let i=0;i<2;i++){changed();changed=draw();await flush();assert.equal(resets,1)}
 props.listening=false;changed=draw();await flush();assert.equal(resets,2);
 changed();draw();await flush();assert.equal(resets,3);
});
