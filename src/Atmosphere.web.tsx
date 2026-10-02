import {useEffect,useRef} from 'react';
import {designCss} from './designArt';
import {fogShader} from './fogShader';
import {motionCss} from './motionCss';
export function Atmosphere({reduce,mood}:{reduce:boolean;mood:string}){
 const sky=useRef([43+Math.random()*19,79+Math.random()*29,61+Math.random()*23]);
 const ref=useRef<HTMLCanvasElement>(null),settings=useRef({reduce,mood});
 settings.current={reduce,mood};
 useEffect(()=>{const shell=ref.current?.closest('[data-testid="app-shell"]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
 // Tap feedback and pointer parallax share one listener pair on the shell.
 useEffect(()=>{
  const shell=ref.current?.closest('[data-testid="app-shell"]') as HTMLElement|null,root=ref.current?.parentElement,layer=root?.querySelector('.tap-layer');
  if(!shell||!root||!layer)return;
  let raf=0,px=0,py=0;
  const still=()=>shell.getAttribute('data-reduced')==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function move(e:PointerEvent){if(still())return;const r=shell!.getBoundingClientRect();px=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));py=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(still())return;root!.style.setProperty('--px',px.toFixed(3));root!.style.setProperty('--py',py.toFixed(3))})}
  function down(e:PointerEvent){
   if(still())return;move(e);
   const target=(e.target as Element).closest?.('[role=button],[role=tab],[role=radio],[role=link],[role=switch],button,a') as HTMLElement|null;
   if(!target||!shell!.contains(target))return;
   target.classList.remove('tap-squash');void target.offsetWidth;target.classList.add('tap-squash');setTimeout(()=>target.classList.remove('tap-squash'),700);
   const r=shell!.getBoundingClientRect(),burst=document.createElement('div');
   burst.className='tap-burst';burst.style.left=`${e.clientX-r.left}px`;burst.style.top=`${e.clientY-r.top}px`;
   burst.innerHTML='<b></b>'+Array.from({length:7},(_,i)=>`<i style="--a:${Math.round(i*360/7+Math.random()*24)}deg;--r:${Math.round(26+Math.random()*24)}px;animation-delay:${Math.round(Math.random()*50)}ms"></i>`).join('');
   layer!.appendChild(burst);setTimeout(()=>burst.remove(),700);
  }
  shell.addEventListener('pointermove',move,{passive:true});shell.addEventListener('pointerdown',down,{passive:true});
  return()=>{cancelAnimationFrame(raf);shell.removeEventListener('pointermove',move);shell.removeEventListener('pointerdown',down)};
 },[]);
 useEffect(()=>{
  const cv=ref.current;if(!cv)return;
  const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false});if(!gl)return;
  const shaders:WebGLShader[]=[];
  function compile(type:number,source:string){const shader=gl!.createShader(type);if(!shader)return null;shaders.push(shader);gl!.shaderSource(shader,source);gl!.compileShader(shader);return gl!.getShaderParameter(shader,gl!.COMPILE_STATUS)?shader:null}
  const v=compile(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'),f=compile(gl.FRAGMENT_SHADER,fogShader),program=gl.createProgram();
  if(!v||!f||!program){shaders.forEach(s=>gl.deleteShader(s));return}
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);return}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uRes=gl.getUniformLocation(program,'uRes'),uT=gl.getUniformLocation(program,'uT'),uOrb=gl.getUniformLocation(program,'uOrb'),uMood=gl.getUniformLocation(program,'uMood'),uAsk=gl.getUniformLocation(program,'uAsk');
  const moods:Record<string,number[]>={utility:[.25,.3,.12,.15],calm:[1,1,.5,1],approach:[1.2,1.1,.6,1],listening:[2.2,1.15,.6,1],cards:[1.1,.9,.5,1],planning:[3.2,1.35,.7,1.1],research:[3.2,1.35,.7,1.1],reveal:[1.2,1,1,1],error:[.45,.65,.1,.7],blocked:[.7,.85,.8,.9]};
  let m=[...moods.calm],frame=0,last=0,time=20,disposed=false,dirty=true;
  const host=cv.parentElement!;host.classList.add('gl');
  function draw(ts:number){
   if(disposed)return;
   frame=0;
   const dt=last?Math.min((ts-last)/1000,.05):0;last=ts;
   if(document.hidden)return;
   const current=settings.current;
   if(current.reduce&&!dirty)return;
   if(!current.reduce)time+=dt*(.6+.4*m[0]);
   dirty=false;
   const target=moods[current.mood]||moods.calm;
   m=current.reduce?[...target]:m.map((v,i)=>v+(target[i]-v)*(1-Math.exp(-dt*3)));
   const rect=cv!.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2)*.75;
   const factor=Math.min(ratio,1100/Math.max(rect.width,rect.height)),w=Math.max(1,Math.round(rect.width*factor)),h=Math.max(1,Math.round(rect.height*factor));
   if(cv!.width!==w||cv!.height!==h){cv!.width=w;cv!.height=h}
   const orb=host.parentElement?.querySelector('.orb.hero .gb')?.getBoundingClientRect(),ask=host.parentElement?.querySelector('.orb:not(.hero) .gb')?.getBoundingClientRect();
   gl!.viewport(0,0,w,h);gl!.uniform2f(uRes,w,h);gl!.uniform1f(uT,time);
   gl!.uniform3f(uOrb,orb?(orb.left+orb.width/2-rect.left)*factor:0,orb?h-(orb.top+orb.height/2-rect.top)*factor:0,orb?orb.width/2*factor:0);
   gl!.uniform3f(uAsk,ask?(ask.left+ask.width/2-rect.left)*factor:0,ask?h-(ask.top+ask.height/2-rect.top)*factor:0,ask?ask.width/2*factor:0);
   gl!.uniform4f(uMood,m[0],m[1],m[2],m[3]);gl!.drawArrays(gl!.TRIANGLES,0,3);
   if(!current.reduce)frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  const redraw=()=>{dirty=true;if(!frame&&!document.hidden&&!disposed){last=0;frame=requestAnimationFrame(draw)}};
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0}else redraw()};
  document.addEventListener('visibilitychange',visibility);
  const mutations=new MutationObserver(list=>{if(list.some(m=>!(m.target as Element).classList?.contains('tap-layer')))redraw()});mutations.observe(host.parentElement!,{childList:true,subtree:true,attributes:true,attributeFilter:["data-reduced"]});
  const resize=new ResizeObserver(redraw);resize.observe(cv);host.parentElement?.addEventListener('scroll',redraw,true);
  return()=>{disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);resize.disconnect();mutations.disconnect();host.parentElement?.removeEventListener('scroll',redraw,true);host.classList.remove('gl');gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s))};
 },[]);
 return <div aria-hidden="true" className={`atmosphere${reduce?' reduced':''}${mood==='utility'?' utility':''}`}  style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
  <style>{designCss+motionCss+` .reduced *, [data-reduced="true"] *, [data-reduced="true"] *::before, [data-reduced="true"] *::after {animation:none!important;transition:none!important} .utility .mist{opacity:.12}.utility .sky,.utility .embers,.utility .candle{opacity:.15} .orb{pointer-events:none} [data-testid="app-shell"]:has(.gl) .orb .gb{background:rgba(20,14,9,.18)} [data-testid="app-shell"]:has(.gl) .orb .fb{display:none} [role=button]:focus-visible,[role=radio]:focus-visible,[role=tab]:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #F2C284!important;outline-offset:3px}`}</style>
  <div className="room"/><div className="sky"><div className="stars"/><i className="shooting-star" style={{animationDuration:`${sky.current[0]}s`}}/><i className="wandering-moon" style={{animationDuration:`${sky.current[1]}s`}}>☾</i><div className="hidden-constellation" style={{animationDuration:`${sky.current[2]}s`}}>✧ · ˚ · ✦</div></div>
  <div className="candle"/><canvas ref={ref} className="mist"/>
  <div className="embers" style={{'--h':'900px'} as React.CSSProperties}>{Array.from({length:10},(_,i)=><i key={i} style={{'--x':`${8+i*9}%`,'--z':`${i%3+1}px`,'--t':`${14+i}s`,'--d':`${-i*3}s`,'--dx':`${i%2?20:-20}px`} as React.CSSProperties}/>)}</div>
  <div className="tap-layer"/>
 </div>;
}
