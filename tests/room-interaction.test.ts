import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as room from '../src/room';

function component(file:string,imports:Record<string,any>){
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>{
   if(props?.ref)props.ref.current={closest:()=>null};
   return {type,props:props??{},children};
  },
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{
   const i=cursor++,previous=slots[i];
   if(!previous||deps.some((value,j)=>value!==previous[j]))effects.push(effect);
   slots[i]=deps;
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
 }).outputText;
 const jsx=(type:any,props:any)=>react.createElement(type,props,...[props.children??[]].flat());
 runInNewContext(code,{module,exports:module.exports,AbortController,console:{error:()=>{},warn:()=>{}},require:(name:string)=>{
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
 });
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
 });
 assert.ok(!nodes(sky('RoomScene',{spot:'Sky',width:390,height:844,reduce:true,spin})).some(n=>n.type==='OrbVisual'));
});

test('native room keeps the static orb on the stand until the live glass has started',async()=>{
 let resolve!:(glass:unknown)=>void;
 const render=component('../src/RoomScene.tsx',{
  'react-native':{Animated:{Value:class {setValue(){}},timing:()=>({start(){}}),Image:'Animated.Image'},Image:'Image',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'expo-gl':{GLView:'GLView'},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './room':room,'./roomAssets':{roomStills:{Home:'home.jpg'},ballArt:{}},
  './glassNative':{startNativeGlass:()=>new Promise(r=>{resolve=r})},
 });
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
