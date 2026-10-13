import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as realSky from '../src/real-sky';
// Home shows tonight's sky for a fixed day.
const sky={'./retention':{localDay:()=>'2026-10-14'},'./real-sky':realSky};
import * as room from '../src/room';

function component(file:string,imports:Record<string,any>,globals:Record<string,any>={},host=()=>({closest:()=>null,play:async()=>{}})){
 const slots:any[]=[],effects:(()=>void)[]=[],cleanups:any[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>{
   if(props?.ref)props.ref.current=host();
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
 pending[0].resolve({stop(){},style(){},sharpen(){},resume(){}});await tick();
 let tree=draw();
 assert.ok(!tree.some(n=>n.type==='OrbVisual'));
 assert.ok(tree.some(n=>n.type==='video'&&n.props.loop),'ready glass enables the idle clip');
 props.spot='Ask';tree=draw();
 assert.ok(tree.some(n=>n.type==='video'&&!n.props.loop),'ready glass enables flights');
 props.width=375;aligned();
 assert.equal(pending[0].signal.aborted,true);
 props.height=667;aligned();
 let stopped=false;
 pending[1].resolve({stop(){stopped=true},style(){},sharpen(){},resume(){}});await tick();aligned();
 assert.equal(stopped,true,'obsolete startup cannot remove the current fallback');
 pending[2].reject(new Error('unavailable'));await tick();aligned();
});

function nativeRoom(startNativeGlass:()=>Promise<unknown>){
 const timers=new Map<number,{fn:()=>void;ms:number}>();let timerId=0;
 const listeners:Record<string,(e?:any)=>void>={},fades:number[]=[],played:unknown[]=[],positions:number[]=[],durations:number[]=[];
 const player={currentTime:0,muted:false,audioMixingMode:'',replaceAsync:async(clip:unknown)=>{played.push(clip)},play(){},pause(){},
  addListener:(name:string,fn:(e?:any)=>void)=>{listeners[name]=fn;return {remove(){}}}};
 const render=component('../src/RoomScene.tsx',{
  'react-native':{Animated:{Value:class {setValue(value:number){positions.push(value)}stopAnimation(){}interpolate(){return 'tracked'}},timing:(_:unknown,{toValue,duration}:{toValue:number;duration:number})=>({start(){fades.push(toValue);durations.push(duration)}}),Image:'Animated.Image',View:'Animated.View'},Easing:{linear:'linear'},Image:'Image',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'expo-gl':{GLView:'GLView'},'./OrbVisual':{OrbVisual:'OrbVisual'},
  'expo-video':{useVideoPlayer:(_:unknown,setup:(p:typeof player)=>void)=>{setup(player);return player},VideoView:'VideoView'},
  './room':room,'./roomAssets':{roomStills:Object.fromEntries(['Home','Sky','Ask','History','You','Library'].map(s=>[s,`${s}.jpg`])),roomFlights:{'home-ask':'home-ask.mp4','ask-home':'ask-home.mp4'},ballArt:{}},
  './glassNative':{startNativeGlass},
 },{setTimeout:(fn:()=>void,ms:number)=>{timers.set(++timerId,{fn,ms});return timerId},clearTimeout:(id:number)=>{timers.delete(id)}});
 // Fires every pending timer of the given delay, as if that much time passed.
 const elapse=(ms:number)=>[...timers].filter(([,t])=>t.ms===ms).forEach(([id,t])=>{timers.delete(id);t.fn()});
 const pending=(ms:number)=>[...timers.values()].filter(t=>t.ms===ms);
 return {render,listeners,fades,played,player,positions,durations,elapse,pending};
}

test('native room applies layout offsets immediately with either motion setting',()=>{
 const {render,fades}=nativeRoom(()=>new Promise(()=>{}));
 const props={spot:'Home',width:375,height:667,reduce:false,spin:{dragged:false},offset:0};
 for(const reduce of [false,true,false])for(const offset of [0,-107,-241,0]){
  Object.assign(props,{reduce,offset});
  const tree=nodes(render('RoomScene',props));
  assert.equal(tree[0].props.style.transform[0].translateY,offset);
 }
 assert.deepEqual(fades,[]);
});

test('web room applies layout offsets immediately with either motion setting',()=>{
 const animations:unknown[]=[];
 const host=()=>({closest:()=>null,play:async()=>{},animate:(...args:unknown[])=>{
  animations.push(args);return {cancel(){}};
 }});
 const render=component('../src/RoomScene.web.tsx',{
  './glassWeb':{startWebGlass:()=>new Promise(()=>{})},
  'expo-asset':{Asset:{fromModule:(m:string)=>({uri:m})}},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './room':room,'./roomAssets':{roomStills:{Home:'home.jpg'},homeIdle:'idle.mp4'},'./motionCss':{appCss:''},
 },{setTimeout:()=>0},host);
 const props={spot:'Home',width:375,height:667,reduce:false,spin:{dragged:false},offset:0};
 for(const reduce of [false,true,false])for(const offset of [0,-107,-241,0]){
  Object.assign(props,{reduce,offset});
  const tree=nodes(render('RoomScene',props));
  assert.equal(tree[0].props.style.transform,`translateY(${offset}px)`);
 }
 assert.deepEqual(animations,[]);
});

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
 assert.equal(tree.find(n=>n.type==='Animated.View'&&n.props.style.transform?.[0]?.translateX!==undefined).props.style.transform[0].translateX,'tracked','the ball rides the flight track');
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

test('native room lands a flight that never plays, and a finished trip\'s fallback cannot touch the next one',async()=>{
 const {render,listeners,played,player,elapse,pending}=nativeRoom(()=>new Promise(()=>{}));
 const tick=()=>new Promise(r=>setImmediate(r));
 const travel:boolean[]=[];let paused=0;player.pause=()=>{paused++};
 const props={spot:'Home',width:390,height:844,reduce:false,spin:{dragged:false},onTravel:(t:boolean)=>travel.push(t)};
 const draw=()=>nodes(render('RoomScene',props));
 const stills=()=>draw().filter(n=>n.type==='Image').map(n=>n.props.source);
 draw();travel.length=0;
 props.spot='Ask';draw();await tick();draw();
 assert.deepEqual(played,['home-ask.mp4']);
 assert.deepEqual(travel,[true],'the Ask flow hears that the room is flying');
 // The clip never plays: after four seconds the player is stopped and the room lands on the destination.
 assert.equal(pending(4000).length,1);
 elapse(4000);
 assert.equal(paused,1);
 assert.deepEqual(stills(),['Ask.jpg']);
 assert.equal(draw().find(n=>n.type==='VideoView').props.style.opacity,0);
 // The room reports itself settled only after expo-video's audio-session write.
 assert.deepEqual(travel,[true]);
 elapse(300);
 assert.deepEqual(travel,[true,false]);
 // A trip that ends normally clears its fallback, and a stale one cannot stop or land the next trip.
 props.spot='Home';draw();await tick();draw();
 const stale=pending(4000)[0].fn;
 listeners.playingChange({isPlaying:true});listeners.playToEnd();draw();
 assert.equal(pending(4000).length,0,'landing clears the fallback');
 props.spot='Ask';draw();await tick();draw();
 const before=paused;
 stale();
 assert.equal(paused,before);
 assert.deepEqual(stills(),['Ask.jpg','Home.jpg'],'the next trip is still on its way');
});

test('native room keeps the static orb on the stand beneath the live glass',async()=>{
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
 // An iPhone's GL view drew nothing while reporting started, so the orb stays under the glass that covers it.
 assert.ok(tree.findIndex(n=>n.type==='OrbVisual')>=0&&tree.findIndex(n=>n.type==='OrbVisual')<tree.findIndex(n=>n.type==='GLView'),'the static orb stays beneath the live glass');
 assert.equal(tree.find(n=>n.type==='GLView').props.style.opacity,1);
});

test('native fallback stays on the visible stand while travel waits or stalls',async()=>{
 for(const failed of [false,true]){
  const {render,listeners}=nativeRoom(()=>failed?Promise.reject(new Error('GL unavailable')):new Promise(()=>{}));
  const props={spot:'Home',width:390,height:844,reduce:false,spin:{dragged:false}};
  const draw=()=>nodes(render('RoomScene',props));
  draw().find(n=>n.type==='GLView').props.onContextCreate({});
  await new Promise(r=>setImmediate(r));
  const resting=(spot:room.Spot)=>{
   const tree=draw(),orbs=tree.filter(n=>n.type==='OrbVisual');
   assert.equal(orbs.length,1);
   const ball=room.ballOnScreen(room.stillFrame(spot),props.width,props.height)!;
   const box=tree.find(n=>n.children.includes(orbs[0])).props.style;
   assert.equal(box.left,ball.x-ball.r);assert.equal(box.top,ball.y-ball.r);
   assert.equal(orbs[0].props.size,ball.r*2);
   assert.equal(tree.find(n=>n.type==='GLView').props.style.opacity,0);
   assert.equal(tree.find(n=>n.type==='VideoView').props.style.opacity,0);
   assert.equal(tree.filter(n=>n.type==='Image').at(-1).props.source,`${spot}.jpg`);
  };
  resting('Home');
  props.spot='Ask';draw();await new Promise(r=>setImmediate(r));
  resting('Home');
  for(let i=0;i<2;i++){
   listeners.playingChange({isPlaying:true});
   const tree=draw();
   assert.equal(tree.filter(n=>n.type==='OrbVisual').length,1);
   assert.equal(tree.find(n=>n.type==='VideoView').props.style.opacity,1);
   listeners.playingChange({isPlaying:false});resting('Home');
  }
  listeners.playToEnd();resting('Ask');
 }
});

test('the room ball supplies touch feedback before reading, and a drag spins it instead',()=>{
 const events:string[]=[],Platform={OS:'web'};
 const render=component('../src/Home.tsx',{
  ...sky,'react-native':{Platform,Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
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

test('the Ask camera lands the ball on its target and keeps the room covering the screen',()=>{
 for(const [w,h,kb] of [[375,667,260],[390,844,336],[440,956,346]]){
  const rest=room.ballOnScreen(room.stillFrame('Ask'),w,h)!;
  // Keyboard up: the band between the chip under the header and the controls above the keyboard.
  for(const cam of [room.typingBall(w,h,120,h-kb-90),room.thinkingBall(w,h,96)]){
   const {k,tx,ty}=room.cameraTransform(w,h,cam);
   assert.ok(k>=1);
   assert.ok(Math.abs(w/2+k*(rest.x-w/2)+tx-cam.x)<1e-6&&Math.abs(h/2+k*(rest.y-h/2)+ty-cam.y)<1e-6,`${w}x${h} ball lands on target`);
   assert.ok(Math.abs(rest.r*k-cam.r)<1e-6,`${w}x${h} ball radius`);
  }
  const fit=room.typingBall(w,h,120,h-kb-90);
  assert.ok(fit.y+fit.r<=h-kb-90+1e-6&&fit.y-fit.r>=120-1e-6,`${w}x${h} typing ball stays inside its band`);
 }
 // No camera, and a band too short for the resting ball, never shrink the room below the screen.
 assert.deepEqual(room.cameraTransform(390,844,null),{k:1,tx:0,ty:0});
 const tight=room.typingBall(390,844,300,340);
 assert.equal(room.cameraTransform(390,844,tight).k,1);
 assert.ok(tight.y+tight.r<=340+1e-6);
});


test('submission enlarges the ball from typing or the resting room, and the status still fits below it',()=>{
 for(const [width,height] of [[375,667],[390,844],[440,956]]){
  const target=room.thinkingBall(width,height,96);
  for(const bottom of [height-140,height-400]){
   const from=room.typingBall(width,height,152,bottom,target.r/room.pushIn);
   assert.ok(target.r>from.r,`${width}x${height} band to ${bottom}: ${from.r} → ${target.r}`);
   assert.ok(room.cameraTransform(width,height,target).k>room.cameraTransform(width,height,from).k);
  }
  assert.ok(target.r>room.ballOnScreen(room.stillFrame('Ask'),width,height)!.r);
  assert.ok(target.y+target.r+360<=height,`${width}x${height} thinking status fits under the ball`);
 }
});


test('cramped Ask content keeps controls reachable and tracks the ball while scrolling',()=>{
 const cameras:room.Camera[]=[];
 const render=component('../src/AskBall.tsx',{
  ...sky,'react-native':{Platform:{OS:'android'},ScrollView:'ScrollView',View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable'},
  'react-native-svg':{default:'Svg',Circle:'Circle',Defs:'Defs',RadialGradient:'RadialGradient',Stop:'Stop'},
  './Enter':{Shake:'Shake'},'./motion':{motion:{}},'./room':room,'./ui':{colors:{},fonts:{}},
 });
 const props={width:375,height:407,top:96,bottom:12,value:'Will things improve?',onChangeText(){},refused:0,reduce:false,largeText:true,chip:'person controls',note:'disclosure',controls:'submit',onCamera:(cam:room.Camera)=>cameras.push(cam)};
 let tree=render('AskBall',props);
 for(const node of nodes(tree)){
  if(node.children.includes('person controls'))node.props.onLayout({nativeEvent:{layout:{height:70}}});
  if(node.children.includes('disclosure'))node.props.onLayout({nativeEvent:{layout:{height:70}}});
  if(node.children.includes('submit'))node.props.onLayout({nativeEvent:{layout:{height:140}}});
 }
 tree=render('AskBall',props);
 assert.equal(tree.props.scrollEnabled,true);
 const viewport=tree.props.style.height,content=tree.props.contentContainerStyle.height;
 assert.ok(content>viewport);
 for(const label of ['person controls','disclosure','submit']){
  const node=nodes(tree).find(n=>n.children.includes(label));
  assert.ok(node);
  assert.notEqual(node.props['aria-hidden'],true);
  assert.notEqual(node.props.pointerEvents,'none');
  assert.notEqual(node.props.style.opacity,0);
 }
 const initial=cameras.at(-1)!;
 tree.props.onScroll({nativeEvent:{contentOffset:{y:content-viewport}}});
 render('AskBall',props);
 assert.equal(cameras.at(-1)!.y,initial.y-(content-viewport));
 props.height=956;tree=render('AskBall',props);
 assert.equal(tree.props.scrollEnabled,false);
 assert.equal(tree.props.contentContainerStyle.height,tree.props.style.height);
});


test('Ask reserves the supplied keyboard and notice space through resize and dismissal',()=>{
 const listeners:Record<string,(event:any)=>void>={};
 const render=component('../src/AskBall.tsx',{
  ...sky,'react-native':{Platform:{OS:'ios'},Dimensions:{get:()=>({height:844})},Keyboard:{addListener:(event:string,callback:(event:any)=>void)=>{listeners[event]=callback;return {remove(){}}}},ScrollView:'ScrollView',View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable'},
  'react-native-svg':{default:'Svg',Circle:'Circle',Defs:'Defs',RadialGradient:'RadialGradient',Stop:'Stop'},
  './Enter':{Shake:'Shake'},'./motion':{motion:{}},'./room':room,'./ui':{colors:{},fonts:{}},
 });
 for(const height of [667,844,956])for(const keyboard of [0,300])for(const notice of [0,120,200]){
  const bottom=Math.max(12,keyboard)+notice;
  listeners.keyboardWillChangeFrame?.({endCoordinates:{screenY:844-keyboard}});
  const tree=render('AskBall',{width:390,height,top:96,bottom,value:'Will Alex learn?',onChangeText(){},refused:0,reduce:true,largeText:false,chip:null,note:null,controls:null,onCamera(){}});
  assert.equal(tree.props.style.top+tree.props.style.height,height-bottom-12);
  assert.ok(tree.props.contentContainerStyle.height>=tree.props.style.height);
 }
});
