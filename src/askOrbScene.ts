import * as T from 'three';
import {BALL,radialAlpha} from './glassBall';

// The tab bar's Ask orb: the room's glass ball seen from the Ask spot, inside a slow violet-gold aura, with stars that
// twinkle around it and glints that catch on the rim. Its canvas is twice the ball's diameter (the ball fills half).
export const askOrbAim=[0.045,0.338,0.94];

// A four-point star: two thin rays crossing a soft core.
function sparkle(size=64){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=Math.abs((x+.5)/size*2-1),v=Math.abs((y+.5)/size*2-1);
  const a=Math.min(1,Math.exp(-u*u*900)*(1-v)**2+Math.exp(-v*v*900)*(1-u)**2+Math.exp(-(u*u+v*v)*40)*.8);
  data.set([255,255,255,Math.round(a*255)],(y*size+x)*4);
 }
 const t=new T.DataTexture(data,size,size);
 t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;
 return t;
}

export function askOrbDecor(scene:T.Scene,camera:T.Camera){
 const glow=radialAlpha([[0,0],[.42,.55],[.6,.3],[1,0]],128),star=sparkle(),dot=radialAlpha([[0,1],[.3,.5],[1,0]],64);
 const additive={blending:T.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,toneMapped:false,fog:false};
 const aura=new T.Sprite(new T.SpriteMaterial({map:glow,color:0xa77cf0,opacity:.4,...additive}));
 aura.position.copy(BALL);aura.renderOrder=9;scene.add(aura);
 // Stars on a loose ring in the view plane around the ball, leaving the sector below it (the tab's label) dark;
 // a seeded scatter so every launch matches.
 const gap=1.8,from=-Math.PI/2+gap/2;
 let seed=11;
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const stars=Array.from({length:14},(_,i)=>{
  const s=new T.Sprite(new T.SpriteMaterial({map:i%3?dot:star,color:i%4?0xfff0d0:0xd8c4ff,...additive}));
  const angle=from+(i+rnd()*.6)/14*(Math.PI*2-gap),radius=1.25+rnd()*.65;
  s.renderOrder=11;scene.add(s);
  return {s,angle,radius,size:(i%3?.2:.42)*(.7+rnd()*.6),rate:.6+rnd()*1.4,phase:rnd()*6.28};
 });
 // Glints sliding along the upper-left rim, where the candle catches the glass.
 const glints=[0,1].map(i=>{const s=new T.Sprite(new T.SpriteMaterial({map:star,color:0xfff6e2,...additive}));s.renderOrder=12;scene.add(s);return {s,phase:i*3.1}});
 const right=new T.Vector3(),up=new T.Vector3(),at=(angle:number,radius:number,out:T.Vector3)=>
  out.copy(BALL).addScaledVector(right,Math.cos(angle)*radius).addScaledVector(up,Math.sin(angle)*radius);
 return (t:number,g:number)=>{
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
  const breath=.5+.5*Math.sin(t*.9);
  aura.scale.setScalar(2.9+.2*breath);aura.material.opacity=(.3+.15*breath)*g;
  for(const {s,angle,radius,size,rate,phase} of stars){
   const twinkle=Math.max(0,Math.sin(t*rate+phase))**3;
   at(angle+.12*Math.sin(t*.05+phase),radius,s.position);
   s.scale.setScalar(size*(.5+.5*twinkle));s.material.opacity=.35+.65*twinkle;
  }
  for(const {s,phase} of glints){
   const k=(t*.11+phase/6.28)%1,flash=Math.sin(Math.min(1,k*5)*Math.PI)**2;
   at(2.2+k*.9,.93,s.position);
   s.scale.setScalar(.5*flash);s.material.opacity=flash;
  }
 };
}
