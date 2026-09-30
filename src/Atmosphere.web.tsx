import {useEffect,useRef} from 'react';
import {designCss} from './designArt';
import {fogShader} from './fogShader';
import {motionCss} from './motionCss';
export function Atmosphere({reduce,mood}:{reduce:boolean;mood:string}){
 const sky=useRef([43+Math.random()*19,79+Math.random()*29,61+Math.random()*23]);
 const ref=useRef<HTMLCanvasElement>(null),settings=useRef({reduce,mood});
 settings.current={reduce,mood};
 useEffect(()=>{const shell=ref.current?.closest('[data-testid="app-shell"]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
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
  const moods:Record<string,number[]>={calm:[1,1,.5,1],approach:[1.2,1.1,.6,1],listening:[2.2,1.15,.6,1],cards:[1.1,.9,.5,1],planning:[3.2,1.35,.7,1.1],research:[3.2,1.35,.7,1.1],reveal:[1.2,1,1,1],error:[.45,.65,.1,.7],blocked:[.7,.85,.8,.9]};
  let m=[...moods.calm],frame=0,last=0,time=20,disposed=false,dirty=true;
  const host=cv.parentElement!;host.classList.add('gl');
  function draw(ts:number){
   if(disposed)return;
   frame=requestAnimationFrame(draw);
   const dt=last?Math.min((ts-last)/1000,.05):0;last=ts;
   if(document.hidden)return;
   const current=settings.current;
   if(current.reduce&&!dirty)return;
   if(!current.reduce)time+=dt;
   dirty=false;
   const target=moods[current.mood]||moods.calm;
   m=m.map((v,i)=>v+(target[i]-v)*(1-Math.exp(-dt*3)));
   const rect=cv!.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2)*.75;
   const factor=Math.min(ratio,1100/Math.max(rect.width,rect.height)),w=Math.max(1,Math.round(rect.width*factor)),h=Math.max(1,Math.round(rect.height*factor));
   if(cv!.width!==w||cv!.height!==h){cv!.width=w;cv!.height=h}
   const orb=host.parentElement?.querySelector('.orb.hero .gb')?.getBoundingClientRect(),ask=host.parentElement?.querySelector('.orb:not(.hero) .gb')?.getBoundingClientRect();
   gl!.viewport(0,0,w,h);gl!.uniform2f(uRes,w,h);gl!.uniform1f(uT,time);
   gl!.uniform3f(uOrb,orb?(orb.left+orb.width/2-rect.left)*factor:0,orb?h-(orb.top+orb.height/2-rect.top)*factor:0,orb?orb.width/2*factor:0);
   gl!.uniform3f(uAsk,ask?(ask.left+ask.width/2-rect.left)*factor:0,ask?h-(ask.top+ask.height/2-rect.top)*factor:0,ask?ask.width/2*factor:0);
   gl!.uniform4f(uMood,m[0],m[1],m[2],m[3]);gl!.drawArrays(gl!.TRIANGLES,0,3);
  }
  frame=requestAnimationFrame(draw);
  const redraw=()=>{dirty=true};
  const mutations=new MutationObserver(redraw);mutations.observe(host.parentElement!,{childList:true,subtree:true,attributes:true,attributeFilter:["data-reduced"]});
  const resize=new ResizeObserver(redraw);resize.observe(cv);host.parentElement?.addEventListener('scroll',redraw,true);
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();host.parentElement?.removeEventListener('scroll',redraw,true);host.classList.remove('gl');gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s))};
 },[]);
 return <div aria-hidden="true" className={reduce?'atmosphere reduced':'atmosphere'} style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
  <style>{designCss+motionCss+` .reduced *, [data-reduced="true"] *, [data-reduced="true"] *::before {animation:none!important;transition:none!important} .orb{pointer-events:none} [data-testid="app-shell"]:has(.gl) .orb .gb{background:rgba(20,14,9,.18)} [data-testid="app-shell"]:has(.gl) .orb .fb{display:none} [role=button]:focus-visible,[role=radio]:focus-visible,[role=tab]:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #F2C284!important;outline-offset:3px}`}</style>
  <div className="room"/><div className="sky"><i className="shooting-star" style={{animationDuration:`${sky.current[0]}s`}}/><i className="wandering-moon" style={{animationDuration:`${sky.current[1]}s`}}>☾</i><div className="hidden-constellation" style={{animationDuration:`${sky.current[2]}s`}}>✧ · ˚ · ✦</div></div>
  <div className="candle"/><canvas ref={ref} className="mist"/>
  <div className="embers" style={{'--h':'900px'} as React.CSSProperties}>{Array.from({length:10},(_,i)=><i key={i} style={{'--x':`${8+i*9}%`,'--z':`${i%3+1}px`,'--t':`${14+i}s`,'--d':`${-i*3}s`,'--dx':`${i%2?20:-20}px`} as React.CSSProperties}/>)}</div>
 </div>;
}
