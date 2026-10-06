import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {Asset} from 'expo-asset';
import {OrbVisual} from './OrbVisual';
import {appCss} from './motionCss';
import type {BallSpin} from './RoomScene';
import {ballOnScreen,clipFrames,clipUrl,flightKey,roomCover,idleKey,maxBallRadius,roomAssetBase,roomFps,roomVersion,stillFrame,type BallFrame,type Spot} from './room';
import {ballArt,homeIdle,roomStills} from './roomAssets';
import type {BallStyle} from './types';

// The glass ball is ported from the Claude Design canvas artboard project/Library.dc.html ("Library").
// Keep its look identical to that source. Its library room now only lights and reflects in the glass (the
// cube map); the screen shows the rendered room video, and this canvas draws the ball alone over it.
// aim() runs before every frame: it places the canvas and returns the camera's direction from the ball,
// or null while the ball is out of frame.
function startScene(canvas:HTMLCanvasElement,S:number,motion:{reduce:boolean},grip:BallSpin,aim:()=>number[]|null){
 const W=S,H=S;
 let seed=7;
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const mk=(w:number,h:number,draw:(g:CanvasRenderingContext2D,w:number,h:number)=>void,srgb?:boolean)=>{
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d')!,w,h);
  const t=new T.CanvasTexture(c);
  if(srgb!==false)t.colorSpace=T.SRGBColorSpace;
  return t;
 };

 // ---------- renderer ----------
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.setSize(W,H,false);
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.2;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;
 renderer.setClearColor(0x000000,0);

 const scene=new T.Scene();
 scene.fog=new T.FogExp2(0x060403,0.06);
 const BALL=new T.Vector3(0,1.55,0);
 // The canvas's original camera distance (so fog and halo read the same); the ball fills half the canvas.
 const CAM_D=8.43,FILL=0.5;
 const camera=new T.PerspectiveCamera(2*Math.atan(Math.tan(Math.asin(1/CAM_D))/FILL)*180/Math.PI,1,0.1,60);
 camera.layers.set(1);

 // ---------- textures ----------
 // Library dropped Main's 1024×768 backdrop; replay the rnd() calls its draw made, so every book and jar matches the canvas.
 for(let row=0;row<3;row++)for(let x=10;x<1024;x+=26+rnd()*42){rnd();rnd();rnd();rnd()}
 for(let i=0;i<90;i++){rnd();rnd();rnd();rnd();rnd()}

 const woodTex=mk(1024,1024,(g,w,h)=>{
  g.fillStyle='#2b170b';g.fillRect(0,0,w,h);
  for(let i=0;i<480;i++){
   const y=rnd()*h,amp=2+rnd()*7,fr=(1+Math.floor(rnd()*4))*2*Math.PI/w,ph=rnd()*6.28;
   g.strokeStyle=rnd()>0.5?'rgba(96,56,28,'+(0.12+rnd()*0.3)+')':'rgba(10,5,2,'+(0.18+rnd()*0.35)+')';
   g.lineWidth=0.6+rnd()*2.6;
   g.beginPath();
   for(let x=0;x<=w;x+=16){const yy=y+Math.sin(x*fr+ph)*amp;if(x)g.lineTo(x,yy);else g.moveTo(x,yy)}
   g.stroke();
  }
  for(let i=0;i<6000;i++){g.fillStyle='rgba(0,0,0,'+rnd()*0.25+')';g.fillRect(rnd()*w,rnd()*h,1+rnd()*4,1)}
 });
 woodTex.wrapS=woodTex.wrapT=T.RepeatWrapping;
 woodTex.repeat.set(3,3);
 woodTex.anisotropy=renderer.capabilities.getMaxAnisotropy();

 const radial=(stops:[number,string][])=>mk(256,256,(g,w,h)=>{
  const rg=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  stops.forEach(s=>rg.addColorStop(s[0],s[1]));
  g.fillStyle=rg;g.fillRect(0,0,w,h);
 });
 const shadowTex=radial([[0,'rgba(0,0,0,.95)'],[0.45,'rgba(0,0,0,.55)'],[1,'rgba(0,0,0,0)']]);
 const dotTex=radial([[0,'rgba(255,255,255,1)'],[0.3,'rgba(255,255,255,.5)'],[1,'rgba(255,255,255,0)']]);
 const haloTex=radial([[0,'rgba(255,255,255,.18)'],[0.45,'rgba(255,255,255,.5)'],[0.58,'rgba(255,255,255,.32)'],[1,'rgba(255,255,255,0)']]);
 const flameTex=mk(128,256,(g,w,h)=>{
  g.translate(w/2,h*0.7);
  g.scale(1,2.6);
  const rg=g.createRadialGradient(0,0,0,0,0,w*0.42);
  rg.addColorStop(0,'rgba(255,252,236,1)');rg.addColorStop(0.3,'rgba(255,228,150,1)');
  rg.addColorStop(0.65,'rgba(255,150,50,.75)');rg.addColorStop(1,'rgba(255,90,20,0)');
  g.fillStyle=rg;g.beginPath();g.arc(0,0,w*0.42,0,Math.PI*2);g.fill();
 });
 const windowTex=mk(256,320,(g,w,h)=>{
  g.fillStyle='#dfe9ff';g.fillRect(0,0,w,h);
  g.fillStyle='#0a0806';
  g.fillRect(0,0,w,10);g.fillRect(0,h-10,w,10);g.fillRect(0,0,10,h);g.fillRect(w-10,0,10,h);
  g.fillRect(w/2-5,0,10,h);g.fillRect(0,h/3-4,w,8);g.fillRect(0,2*h/3-4,w,8);
 });
 const waxGlowTex=mk(16,256,(g,w,h)=>{
  const lg=g.createLinearGradient(0,0,0,h);
  lg.addColorStop(0,'#ffffff');lg.addColorStop(0.18,'#7a7a7a');lg.addColorStop(0.5,'#151515');lg.addColorStop(1,'#000000');
  g.fillStyle=lg;g.fillRect(0,0,w,h);
 },false);

 // ---------- set ----------
 // reading table: same wood top, now a real piece of furniture
 const topTex=woodTex.clone();topTex.repeat.set(0.46,0.52);topTex.needsUpdate=true;
 const table=new T.Mesh(new T.PlaneGeometry(4.6,5.2),new T.MeshStandardMaterial({map:topTex,roughness:0.66,metalness:0,envMapIntensity:0.4}));
 table.rotation.x=-Math.PI/2;
 table.position.z=0.8;
 table.receiveShadow=true;
 scene.add(table);

 // ---------- the library room (real geometry) ----------
 const FLOOR=-0.9;
 const caseTex=woodTex.clone();caseTex.repeat.set(0.35,0.6);caseTex.needsUpdate=true;
 const caseMat=new T.MeshStandardMaterial({map:caseTex,color:0x9a7a62,roughness:0.72,metalness:0,envMapIntensity:0.3});
 const darkWood=new T.MeshStandardMaterial({color:0x1a0f08,roughness:0.85});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material)=>{
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
 };
 const floorTex=woodTex.clone();floorTex.repeat.set(2,2);floorTex.needsUpdate=true;
 const floor=new T.Mesh(new T.PlaneGeometry(22,22),new T.MeshStandardMaterial({map:floorTex,color:0x5a4434,roughness:0.82}));
 floor.rotation.x=-Math.PI/2;floor.position.y=FLOOR;floor.receiveShadow=true;scene.add(floor);
 const wall=new T.Mesh(new T.PlaneGeometry(18,9),new T.MeshStandardMaterial({color:0x1e130b,roughness:0.9}));
 wall.position.set(0,FLOOR+4.5,-3.8);wall.receiveShadow=true;scene.add(wall);

 scene.add(box(4.6,0.09,5.2,0,-0.047,0.8,caseMat));
 scene.add(box(4.4,0.16,5.0,0,-0.17,0.8,darkWood));
 [[-2.1,-1.65],[2.1,-1.65],[-2.1,3.25],[2.1,3.25]].forEach(p=>scene.add(box(0.14,-0.25-FLOOR,0.14,p[0],(FLOOR-0.25)/2,p[1],darkWood)));

 const BOOK_COLS=[0x5a1e18,0x1f3424,0x1c2638,0x6b4a2c,0x1a1512,0x6e5420,0x3a1f30,0x4a2a18,0x2a3a30,0x7a5a3a];
 const GLASS_COLS=[0x8a4a14,0x2f4a2a,0x4a2440,0x8a8070,0x22344a,0x6a3a12];
 type Item={m:T.Matrix4;c:T.Color|null};
 const books:Item[]=[],bands:Item[]=[],jarList:Item[][]=[[],[],[]],corks:Item[]=[],lids:Item[]=[],labels:Item[]=[];
 const tm=new T.Matrix4(),tq=new T.Quaternion(),tv=new T.Vector3(),ts=new T.Vector3(),te=new T.Euler();
 const put=(list:Item[],gm:T.Matrix4,x:number,y:number,z:number,w:number,h:number,d:number,rz:number,c:T.Color|null)=>{
  tm.compose(tv.set(x,y,z),tq.setFromEuler(te.set(0,0,rz||0)),ts.set(w,h,d));
  list.push({m:tm.clone().premultiply(gm),c});
 };
 const shade=(hex:number,k:number)=>new T.Color(hex).multiplyScalar(k);
 const JAR_H=[0.29,0.2,0.23],JAR_R=[0.065,0.08,0.09];
 const SHELVES=[0.16,0.66,1.16,1.66,2.16,2.66,3.16,3.66,4.16];

 const unit=(W2:number,H2:number,D:number,kind:'books'|'jars',px:number,pz:number,ry:number)=>{
  const g=new T.Group();
  g.add(box(W2,H2,0.04,0,H2/2,0.02,caseMat));
  g.add(box(0.07,H2,D,-W2/2+0.035,H2/2,D/2,caseMat));
  g.add(box(0.07,H2,D,W2/2-0.035,H2/2,D/2,caseMat));
  g.add(box(W2+0.16,0.12,D+0.08,0,H2+0.06,D/2+0.02,caseMat));
  g.add(box(W2+0.24,0.05,D+0.12,0,H2+0.145,D/2+0.03,caseMat));
  g.add(box(W2,0.14,D,0,0.07,D/2,darkWood));
  SHELVES.forEach(y=>g.add(box(W2-0.14,0.04,D-0.02,0,y,D/2,caseMat)));
  g.position.set(px,FLOOR,pz);g.rotation.y=ry||0;
  scene.add(g);g.updateMatrixWorld(true);
  const gm=g.matrixWorld;
  SHELVES.forEach((y,si)=>{
   const top=y+0.02;
   const clear=(si+1<SHELVES.length?SHELVES[si+1]:H2)-top-0.04;
   let x=-W2/2+0.09;
   const xEnd=W2/2-0.09;
   if(kind==='books'){
    while(x<xEnd-0.03){
     const r=rnd();
     if(r<0.06){x+=0.06+rnd()*0.14;continue}
     if(r<0.12&&xEnd-x>0.34){
      const bw=0.24+rnd()*0.07;let yy=top;
      const n=2+Math.floor(rnd()*4);
      for(let k=0;k<n;k++){
       const th=0.03+rnd()*0.035,bd=0.17+rnd()*0.05;
       put(books,gm,x+bw/2+(rnd()-0.5)*0.02,yy+th/2,D-0.04-bd/2,bw,th,bd,0,shade(BOOK_COLS[Math.floor(rnd()*BOOK_COLS.length)],0.6+rnd()*0.6));
       yy+=th;
      }
      x+=bw+0.03;
      continue;
     }
     const th=0.026+rnd()*0.045,bh=Math.min(clear,0.21+rnd()*0.14),bd=0.16+rnd()*0.07;
     const z=D-0.035-bd/2-rnd()*0.025;
     const tilt=rnd()<0.05?0.12:(rnd()-0.5)*0.02;
     const col=BOOK_COLS[Math.floor(rnd()*BOOK_COLS.length)];
     put(books,gm,x+th/2,top+bh/2,z,th,bh,bd,tilt,shade(col,0.55+rnd()*0.65));
     if(rnd()<0.45){
      put(bands,gm,x+th/2,top+bh*0.82,z+bd/2+0.002,th*1.02,0.011,0.004,tilt,null);
      put(bands,gm,x+th/2,top+bh*0.18,z+bd/2+0.002,th*1.02,0.008,0.004,tilt,null);
     }
     x+=th+0.002;
    }
   }else{
    while(x<xEnd-0.08){
     const sh=Math.floor(rnd()*3);
     const s=Math.min(1.25,(clear*0.92)/JAR_H[sh])*(0.72+rnd()*0.4);
     const rr=JAR_R[sh]*s;
     if(x+rr*2>xEnd)break;
     const cx=x+rr,cz=D*0.5+(rnd()-0.5)*0.08;
     put(jarList[sh],gm,cx,top,cz,s,s,s,0,shade(GLASS_COLS[Math.floor(rnd()*GLASS_COLS.length)],0.8+rnd()*0.5));
     if(sh===1)put(lids,gm,cx,top+JAR_H[1]*s+0.012*s,cz,s,s,s,0,null);
     else put(corks,gm,cx,top+JAR_H[sh]*s+0.012*s,cz,s,s,s,0,null);
     if(rnd()<0.7)put(labels,gm,cx,top+JAR_H[sh]*s*0.42,cz+rr*0.98+0.003,rr*1.15,JAR_H[sh]*s*0.28,1,0,null);
     x+=rr*2+0.035+rnd()*0.08;
    }
   }
  });
 };
 unit(2.1,4.9,0.4,'books',-2.45,-3.75,0);
 unit(2.6,4.9,0.42,'jars',0,-3.75,0);
 unit(2.1,4.9,0.4,'books',2.45,-3.75,0);
 unit(2.0,4.9,0.4,'books',-2.75,-2.1,1.25);
 unit(2.0,4.9,0.4,'books',2.75,-2.1,-1.25);

 const inst=(geo:T.BufferGeometry,mat:T.Material,list:Item[],shadows:boolean)=>{
  if(!list.length)return;
  const im=new T.InstancedMesh(geo,mat,list.length);
  list.forEach((it,i)=>{im.setMatrixAt(i,it.m);if(it.c)im.setColorAt(i,it.c)});
  im.instanceMatrix.needsUpdate=true;
  if(im.instanceColor)im.instanceColor.needsUpdate=true;
  im.castShadow=!!shadows;im.receiveShadow=true;
  scene.add(im);
 };
 const unitBox=new T.BoxGeometry(1,1,1);
 inst(unitBox,new T.MeshStandardMaterial({color:0xffffff,roughness:0.64}),books,true);
 inst(unitBox,new T.MeshStandardMaterial({color:0xc9a060,metalness:1,roughness:0.38,envMapIntensity:1.2}),bands,false);
 const lathe=(pts:number[][])=>new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),40);
 const jarGeos=[
  lathe([[0,0],[0.06,0],[0.065,0.01],[0.065,0.17],[0.05,0.2],[0.022,0.23],[0.02,0.28],[0.026,0.29],[0.001,0.29]]),
  lathe([[0,0],[0.075,0],[0.08,0.01],[0.08,0.16],[0.07,0.18],[0.06,0.185],[0.06,0.2],[0.001,0.2]]),
  lathe([[0,0],[0.05,0],[0.085,0.04],[0.09,0.08],[0.07,0.13],[0.025,0.16],[0.022,0.22],[0.028,0.23],[0.001,0.23]])
 ];
 const glassMat=new T.MeshStandardMaterial({color:0xffffff,roughness:0.06,metalness:0,transparent:true,opacity:0.62,envMapIntensity:1.6,depthWrite:false});
 jarList.forEach((list,i)=>inst(jarGeos[i],glassMat,list,false));
 const corkGeo=new T.CylinderGeometry(0.024,0.021,0.035,16);corkGeo.translate(0,0.005,0);
 inst(corkGeo,new T.MeshStandardMaterial({color:0x6a4a2c,roughness:0.9}),corks,false);
 const lidGeo=new T.CylinderGeometry(0.066,0.066,0.025,32);
 inst(lidGeo,new T.MeshStandardMaterial({color:0x8a6a3a,metalness:1,roughness:0.45}),lids,false);
 inst(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial({color:0x8a7656,roughness:0.95}),labels,false);

 const decal=(size:number,x:number,z:number,opacity:number)=>{
  const m=new T.Mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity,polygonOffset:true,polygonOffsetFactor:-2}));
  m.rotation.x=-Math.PI/2;m.position.set(x,0.002,z);scene.add(m);return m;
 };
 decal(2.7,0,0,0.8);

 // brass stand (lathe-turned)
 const brass=new T.MeshStandardMaterial({color:0xb08850,metalness:1,roughness:0.33,envMapIntensity:1.3,side:T.DoubleSide});
 const prof=[[0.001,0],[0.93,0],[0.975,0.02],[0.985,0.06],[0.97,0.1],[0.9,0.12],[0.82,0.13],[0.8,0.165],[0.72,0.185],[0.7,0.225],[0.56,0.25],[0.4,0.275],[0.26,0.305],[0.19,0.35],[0.16,0.42],[0.175,0.47],[0.15,0.51],[0.14,0.55],[0.17,0.58],[0.26,0.61],[0.38,0.645],[0.49,0.685],[0.57,0.72],[0.595,0.745],[0.55,0.755],[0.46,0.745]]
  .map(p=>new T.Vector2(p[0],p[1]));
 const stand=new T.Mesh(new T.LatheGeometry(prof,160),brass);
 stand.castShadow=true;stand.receiveShadow=true;
 scene.add(stand);
 const band=new T.Mesh(new T.TorusGeometry(0.986,0.012,12,160),brass);
 band.rotation.x=Math.PI/2;band.position.y=0.06;scene.add(band);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3+Math.PI/2;
  const foot=new T.Mesh(new T.SphereGeometry(0.13,32,16),brass);
  foot.scale.set(1,0.55,1.35);
  foot.position.set(Math.cos(a)*0.9,0.05,Math.sin(a)*0.9);
  foot.rotation.y=-a;
  foot.castShadow=true;scene.add(foot);
 }

 // candle
 const CX=-1.22,CZ=-1.15;
 const dish=new T.Mesh(new T.CylinderGeometry(0.3,0.26,0.04,64),brass);
 dish.position.set(CX,0.02,CZ);dish.castShadow=true;scene.add(dish);
 const wax=new T.Mesh(new T.CylinderGeometry(0.125,0.135,0.95,64,1),
  new T.MeshStandardMaterial({color:0xcdbb98,roughness:0.72,emissive:0xff9a45,emissiveMap:waxGlowTex,emissiveIntensity:0.55}));
 wax.position.set(CX,0.04+0.475,CZ);scene.add(wax);
 const wick=new T.Mesh(new T.CylinderGeometry(0.006,0.006,0.06,8),new T.MeshBasicMaterial({color:0x120a05}));
 wick.position.set(CX,1.02,CZ);scene.add(wick);
 const flame=new T.Sprite(new T.SpriteMaterial({map:flameTex,blending:T.AdditiveBlending,depthWrite:false,transparent:true,toneMapped:false}));
 flame.position.set(CX,1.12,CZ);flame.scale.set(0.1,0.24,1);scene.add(flame);
 const flameGlow=new T.Sprite(new T.SpriteMaterial({map:dotTex,color:0xff9a48,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.22,toneMapped:false}));
 flameGlow.position.copy(flame.position);flameGlow.scale.set(0.9,0.9,1);scene.add(flameGlow);
 decal(0.9,CX,CZ,0.6);

 // lights
 const candle=new T.PointLight(0xff9a48,7,0,2);
 candle.position.set(CX,1.13,CZ);
 candle.castShadow=true;
 candle.shadow.mapSize.set(1024,1024);
 candle.shadow.bias=-0.003;
 candle.shadow.camera.near=0.05;
 scene.add(candle);
 const inner=new T.PointLight(0xffb46a,1.6,4,2);
 inner.position.copy(BALL);scene.add(inner);
 const moon=new T.DirectionalLight(0x9fb6ff,0.16);
 moon.position.set(-3.5,4.2,3.5);scene.add(moon);
 scene.add(new T.HemisphereLight(0x3a2a1c,0x080503,0.22));
 const spill=new T.PointLight(0xff9a50,1.3,7,2);
 spill.position.set(2.3,2.7,-1.7);scene.add(spill);

 // window: only seen in reflections
 const win=new T.Mesh(new T.PlaneGeometry(1.6,2.0),new T.MeshBasicMaterial({map:windowTex,fog:false}));
 win.material.color.setScalar(2.6);
 win.position.set(-3.4,4.0,3.4);win.lookAt(BALL);scene.add(win);

 // ---------- the ball ----------
 const cubeRT=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const cubeCam=new T.CubeCamera(0.05,40,cubeRT);
 cubeCam.position.copy(BALL);scene.add(cubeCam);

 const uniforms={
  uEnv:{value:cubeRT.texture},
  uTime:{value:0},uSwirl:{value:0},uGlow:{value:1},
  uCenter:{value:BALL.clone()},uRadius:{value:1},
  uLightPos:{value:candle.position.clone()},uLightCol:{value:new T.Color(0xffb070)},
  uGlowCol:{value:new T.Color(0xffb46a)},uMist:{value:new T.Color(0x6a3a8a)},
  uRot:{value:new T.Matrix3()},
  uStyle:{value:null as T.Texture|null},uClean:{value:null as T.Texture|null},uStyled:{value:0}
 };
 const ballMat=new T.ShaderMaterial({
  uniforms,
  vertexShader:`
   varying vec3 vWorld; varying vec3 vN;
   void main(){
    vec4 w = modelMatrix * vec4(position,1.0);
    vWorld = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
   }`,
  fragmentShader:`
   uniform samplerCube uEnv; uniform float uTime, uSwirl, uGlow, uRadius, uStyled; uniform mat3 uRot;
   uniform sampler2D uStyle, uClean;
   uniform vec3 uCenter, uLightPos, uLightCol, uGlowCol, uMist;
   varying vec3 vWorld; varying vec3 vN;
   float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
   float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
   }
   float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return s; }
   float density(vec3 p){
    p = uRot * p;
    float r = length(p);
    float ang = uSwirl*(1.35 - r) + p.y*1.8;
    float cs = cos(ang), sn = sin(ang);
    vec3 q = vec3(cs*p.x - sn*p.z, p.y*1.3, sn*p.x + cs*p.z);
    float n = fbm(q*2.1 + vec3(0.0, uTime*0.04, 0.0));
    float fil = exp(-pow((n - 0.6)*22.0, 2.0)) + 0.2*smoothstep(0.64, 0.8, n);
    return fil * smoothstep(0.98, 0.5, r) * smoothstep(0.08, 0.32, r);
   }
   vec3 tone(vec3 c){
    #if defined( TONE_MAPPING )
     return toneMapping(c);
    #else
     return c;
    #endif
   }
   void main(){
    vec3 V = normalize(vWorld - cameraPosition);
    vec3 N = normalize(vN);
    float cosi = clamp(dot(-V, N), 0.0, 1.0);
    float F = 0.04 + 0.96*pow(1.0 - cosi, 5.0);
    vec3 refl = textureCube(uEnv, reflect(V, N)).rgb;

    vec3 Tdir = refract(V, N, 1.0/1.47);
    vec3 ro = (vWorld - uCenter)/uRadius;
    float b = dot(ro, Tdir); float c = dot(ro, ro) - 1.0;
    float tEx = max(-b + sqrt(max(b*b - c, 0.0)), 0.0);
    vec3 pEx = ro + Tdir*tEx; vec3 N2 = normalize(pEx);
    vec3 T2 = refract(Tdir, -N2, 1.47);
    if (dot(T2, T2) < 1e-4) T2 = reflect(Tdir, -N2);
    vec3 refr = textureCube(uEnv, T2).rgb * vec3(1.0, 0.95, 0.88);

    vec3 L = normalize(uLightPos - vWorld);
    vec3 Hh = normalize(L - V);
    vec3 spec = uLightCol * (pow(max(dot(N, Hh), 0.0), 1400.0)*14.0 + pow(max(dot(N, Hh), 0.0), 90.0)*0.25);
    // A Plus style: its AI render of the ball, exactly as drawn at rest. Inside the rim's refraction, the render
    // without its glints is an inner sphere that a spin turns; the rim and the glints stay with the view. The live
    // glass adds the room's reflection and the candle highlight over it, as on Classic.
    if (uStyled > 0.5) {
     mat3 view = mat3(viewMatrix);
     vec2 a = (view*ro).xy;
     float ra = length(a);
     vec2 b = (view*(uRot*(transpose(view)*vec3(a, sqrt(max(0.64 - ra*ra, 0.0)))))).xy;
     vec3 turned = texture2D(uClean, b*0.5 + 0.5).rgb - texture2D(uClean, a*0.5 + 0.5).rgb;
     vec3 inside = texture2D(uStyle, a*0.5 + 0.5).rgb + turned*smoothstep(0.85, 0.75, ra);
     gl_FragColor = vec4(mix(max(inside, 0.0), tone(refl), F) + tone(spec), 1.0);
     #include <colorspace_fragment>
     return;
    }

    const int STEPS = 26;
    float dt = tEx/float(STEPS);
    float jit = hash(vec3(gl_FragCoord.xy, 3.7)) * dt * 0.6;
    vec3 acc = vec3(0.0); float trans = 1.0;
    for (int i = 0; i < STEPS; i++){
     vec3 p = ro + Tdir*(jit + dt*float(i));
     float r = length(p);
     float d = density(p);
     vec3 col = mix(uGlowCol*1.15, uMist, smoothstep(0.35, 0.95, r));
     float lit = 0.25 + 2.2*exp(-pow((r - 0.32)*3.2, 2.0));
     acc += trans * d * col * lit * uGlow * dt * 1.8;
     acc += trans * uGlowCol * 0.1 * exp(-pow((r - 0.3)*4.5, 2.0)) * uGlow * dt;
     trans *= exp(-d * dt * 2.6);
    }
    vec3 col = refr*0.9*(0.3 + 0.7*trans) + acc;
    col = mix(col, refl, F) + spec;
    gl_FragColor = vec4(tone(col), 1.0);
    #include <colorspace_fragment>
   }`
 });
 const ball=new T.Mesh(new T.SphereGeometry(1,128,96),ballMat);
 ball.position.copy(BALL);ball.layers.set(1);
 scene.add(ball);

 const halo=new T.Sprite(new T.SpriteMaterial({map:haloTex,color:0xffb46a,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,opacity:0.16,toneMapped:false}));
 halo.position.copy(BALL);halo.scale.set(3.7,3.7,1);halo.renderOrder=10;halo.layers.set(1);
 scene.add(halo);

 const KROT=0.011,VMAX=14;
 const spin={dragging:false,id:-1,lx:0,ly:0,lt:0,ax:0,ay:0,vx:0,vy:0,orb:0,moved:0};

 // ---------- drag to spin ----------
 grip.grab=e=>{
  // A second finger leaves the first one's drag alone.
  if(spin.dragging)return;
  spin.dragging=true;spin.id=e.pointerId;spin.lx=e.clientX;spin.ly=e.clientY;spin.moved=0;
  spin.ax=0;spin.ay=0;spin.vx=0;spin.vy=0;spin.lt=performance.now();
  grip.dragged=false;
  try{(e.target as Element).setPointerCapture(e.pointerId)}catch(err){}
 };
 const onDragMove=(e:PointerEvent)=>{
  if(!spin.dragging||e.pointerId!==spin.id)return;
  const dx=e.clientX-spin.lx,dy=e.clientY-spin.ly;
  const now=performance.now(),de=Math.max((now-spin.lt)/1000,0.008);
  spin.lt=now;
  spin.vx+=(Math.max(-VMAX,Math.min(VMAX,dx*KROT/de))-spin.vx)*0.4;
  spin.vy+=(Math.max(-VMAX,Math.min(VMAX,dy*KROT/de))-spin.vy)*0.4;
  spin.lx=e.clientX;spin.ly=e.clientY;
  spin.ax+=dx;spin.ay+=dy;spin.moved+=Math.abs(dx)+Math.abs(dy);
  if(spin.moved>6)grip.dragged=true;
  // Reduced motion schedules no loop, so the ball follows the hand one frame per move.
  if(motion.reduce&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);
 };
 const onDragEnd=(e:PointerEvent)=>{
  if(!spin.dragging||e.pointerId!==spin.id)return;
  spin.dragging=false;
  // Reduced motion keeps the hand's turn but drops the coasting spin afterwards.
  if(motion.reduce||performance.now()-spin.lt>90){spin.vx=0;spin.vy=0}
  // The ball's click, if any, follows this release; after it no drag may swallow a later keyboard activation.
  setTimeout(()=>{grip.dragged=false});
 };
 window.addEventListener('pointermove',onDragMove);
 window.addEventListener('pointerup',onDragEnd);
 window.addEventListener('pointercancel',onDragEnd);
 const rotQ=new T.Quaternion(),dq=new T.Quaternion(),invQ=new T.Quaternion();
 const rotM4=new T.Matrix4(),axis=new T.Vector3(),right=new T.Vector3(),UP=new T.Vector3(0,1,0);
 const turn=(ah:number,av:number,orb:number)=>{
  const ang=Math.hypot(ah,av);
  if(ang<1e-6)return;
  right.set(Math.cos(orb),0,-Math.sin(orb));
  axis.copy(UP).multiplyScalar(ah).addScaledVector(right,av).normalize();
  dq.setFromAxisAngle(axis,ang);
  rotQ.premultiply(dq).normalize();
  invQ.copy(rotQ).invert();
  uniforms.uRot.value.setFromMatrix4(rotM4.makeRotationFromQuaternion(invQ));
 };

 // ---------- loop ----------
 const clock=new T.Clock();
 const pmrem=new T.PMREMGenerator(renderer);
 let t=0,swirl=0,n=0,raf=0,alive=true;
 const capture=()=>{
  ball.visible=false;halo.visible=false;
  cubeCam.update(renderer,scene);
  ball.visible=true;halo.visible=true;
 };
 const frame=()=>{
  raf=0;
  if(!alive)return;
  const reduced=motion.reduce;
  const dt=Math.min(clock.getDelta(),0.05);
  t+=dt;
  swirl+=dt*(reduced?0.03:0.16);

  if(spin.ax||spin.ay){
   turn(spin.ax*KROT,spin.ay*KROT,spin.orb);
   spin.ax=0;spin.ay=0;
  }
  if(spin.dragging){
   if(performance.now()-spin.lt>90){spin.vx*=Math.exp(-dt*12);spin.vy*=Math.exp(-dt*12)}
  }else{
   if(reduced){spin.vx=0;spin.vy=0} // switching to reduced motion mid-coast must not leave a spin to resume
   turn(spin.vx*dt,spin.vy*dt,spin.orb);
   const f=Math.exp(-dt*1.3);
   spin.vx*=f;spin.vy*=f;
   if(Math.abs(spin.vx)<0.002)spin.vx=0;
   if(Math.abs(spin.vy)<0.002)spin.vy=0;
  }
  // Reduced motion leaves the camera still rather than swinging with the spin.
  const orbTarget=reduced?0:Math.max(-0.22,Math.min(0.22,spin.vx*0.035));
  spin.orb+=(orbTarget-spin.orb)*Math.min(1,dt*2.2);
  // The room camera's view of the ball, swung slightly with the spin.
  const dir=aim();
  if(dir){
   const co=Math.cos(spin.orb),so=Math.sin(spin.orb);
   camera.position.set(dir[0]*co+dir[2]*so,dir[1],-dir[0]*so+dir[2]*co).multiplyScalar(CAM_D).add(BALL);
   camera.lookAt(BALL);
  }

  const g=1+0.07*Math.sin(t*1.3);
  uniforms.uTime.value=t;uniforms.uSwirl.value=swirl;uniforms.uGlow.value=g;
  inner.intensity=1.6*g;
  halo.material.opacity=0.13*g;

  // ponytail: the reflected room is captured once (no candle flicker in the glass); recapture if it reads static.
  if(n===0){
   renderer.shadowMap.needsUpdate=true;
   capture();
   scene.environment=pmrem.fromCubemap(cubeRT.texture).texture;
   capture();
  }
  n++;
  if(dir)renderer.render(scene,camera);
  // Reduced motion and hidden pages hold the last frame without scheduling callbacks.
  if(!reduced&&!document.hidden)raf=requestAnimationFrame(frame);
 };
 const resume=()=>{if(alive&&!raf&&!document.hidden){clock.getDelta();raf=requestAnimationFrame(frame)}};
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else resume()};
 document.addEventListener('visibilitychange',visibility);
 const loader=new T.TextureLoader(),textures=new Map<string,T.Texture>();
 const api={
  resume,
  // null is Classic; otherwise the style's glass and clean discs (src/roomAssets.ts), shown once both have loaded.
  style(look:{glass:string;clean:string}|null){
   const load=(uri:string)=>{
    let texture=textures.get(uri);
    if(!texture){
     texture=loader.load(uri,()=>{if(ready()){uniforms.uStyled.value=1;resume()}});
     texture.colorSpace=T.SRGBColorSpace;textures.set(uri,texture);
    }
    return texture;
   };
   const ready=()=>!!(uniforms.uStyle.value?.image&&uniforms.uClean.value?.image);
   uniforms.uStyle.value=look&&load(look.glass);uniforms.uClean.value=look&&load(look.clean);
   uniforms.uStyled.value=ready()?1:0;
   resume();
  },
  stop(){
   alive=false;cancelAnimationFrame(raf);
   window.removeEventListener('pointermove',onDragMove);
   window.removeEventListener('pointerup',onDragEnd);
   window.removeEventListener('pointercancel',onDragEnd);
   grip.grab=undefined;
   document.removeEventListener('visibilitychange',visibility);
   textures.forEach(texture=>texture.dispose());pmrem.dispose();renderer.dispose();renderer.forceContextLoss();
  }
 };
 try{frame()}catch(error){api.stop();throw error}
 return api;
}

const grain=`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><filter id="cbGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#cbGrain)"/></svg>`;

// Clips play from object URLs once fully loaded, so a cut never waits on the network. Streamed clips persist in
// the Cache API where the origin allows it (HTTPS or localhost) and in the HTTP cache elsewhere.
const clips=new Map<string,string>(),loading=new Map<string,Promise<void>>();
const listeners=new Set<()=>void>();
function loadClip(key:string,url:string,persist:boolean){
 let job=loading.get(key);
 if(!job){
  job=(async()=>{
   try{
    const cache=persist&&typeof caches!=='undefined'?await caches.open(`crystal-ball-room-${roomVersion}`).catch(()=>null):null;
    let response=await cache?.match(url);
    if(!response){
     response=await fetch(url);
     if(!response.ok)throw new Error(`${url}: ${response.status}`);
     await cache?.put(url,response.clone()).catch(()=>{});
    }
    clips.set(key,URL.createObjectURL(await response.blob()));
    listeners.forEach(listener=>listener());
   }catch(error){loading.delete(key);console.warn('room clip unavailable',error)}
  })();
  loading.set(key,job);
 }
 return job;
}
const spots:Spot[]=['Home','Sky','Ask','History','You'];
let prefetched=false;
// After the first screen settles, quietly fetch every streamed clip: flights from Home first, then the loops, then the
// Inner Library's push-in (only Home leads into it; it has no loop and no flight out).
function prefetchRoom(){
 if(prefetched)return;
 prefetched=true;
 void loadClip(idleKey('Home'),Asset.fromModule(homeIdle).uri,false);
 if(!roomAssetBase)return;
 const keys=[...spots.slice(1).map(to=>flightKey('Home',to)),...spots.slice(1).map(idleKey),
  ...spots.slice(1).flatMap(from=>spots.filter(to=>to!==from).map(to=>flightKey(from,to))),flightKey('Home','Library')];
 setTimeout(async()=>{for(const key of keys)await loadClip(key,clipUrl(key),true)},1500);
}

// The presented frame's media time (requestVideoFrameCallback where supported, so the ball lands on the exact frame).
function frameOf(video:HTMLVideoElement|null,frames:BallFrame[],loop:boolean){
 if(!video||video.readyState<2||!frames.length)return null;
 const time=Number(video.dataset.mediaTime??video.currentTime),i=Math.round(time*roomFps);
 return frames[loop?i%frames.length:Math.min(frames.length-1,i)];
}
function watchFrames(video:HTMLVideoElement|null){
 if(!video||!('requestVideoFrameCallback' in video))return;
 const next=(_:number,meta:{mediaTime:number})=>{video.dataset.mediaTime=String(meta.mediaTime);video.requestVideoFrameCallback(next)};
 video.requestVideoFrameCallback(next);
}

type Flight={key:string;url:string;to:Spot};
const fill={position:'absolute',left:0,top:0,width:'100%',height:'100%',objectFit:'cover',display:'block'} as const;

// The rendered room behind every tab: a tab change flies the camera to its spot (still → flight → loop cut
// pixel-exact), the live glass ball rides on top at each frame's tracked position, and reduced motion fades stills.
export function RoomScene({spot,width,height,reduce,spin,ball='classic'}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin;ball?:BallStyle}){
 const [at,setAt]=useState(spot),[flight,setFlight]=useState<Flight|null>(null),[fading,setFading]=useState<Spot|null>(null);
 const [,setLoaded]=useState(0),[failed,setFailed]=useState(false);
 const ref=useRef<HTMLCanvasElement>(null),idle=useRef<HTMLVideoElement>(null),fly=useRef<HTMLVideoElement>(null);
 const motion=useRef({reduce}),scene=useRef<ReturnType<typeof startScene>|null>(null),state=useRef({at,flight,width,height});
 motion.current.reduce=reduce;state.current={at,flight,width,height};
 useEffect(()=>{const update=()=>setLoaded(n=>n+1);listeners.add(update);prefetchRoom();return()=>{listeners.delete(update)}},[]);
 useEffect(()=>{
  const target=flight?.to??at;
  if(spot===target)return;
  // A flight needs its clip in hand and a resting start; otherwise cut (or fade, for reduced motion) to the still.
  const url=!flight&&!reduce&&!failed?clips.get(flightKey(at,spot)):undefined;
  if(url){setFlight({key:flightKey(at,spot),url,to:spot});return}
  if(reduce&&!failed)setFading(target);
  setFlight(null);setAt(spot);
 },[spot]);
 // Land on the destination when the clip ends, fails, or never starts (an autoplay block must not strand the camera).
 const land=(done:Flight)=>{if(state.current.flight===done){setAt(done.to);setFlight(null)}};
 useEffect(()=>{
  if(!flight)return;
  watchFrames(fly.current);
  fly.current?.play().catch(()=>land(flight));
  const timer=setTimeout(()=>land(flight),4000);
  return()=>clearTimeout(timer);
 },[flight]);
 // Switching to reduced motion mid-flight cuts straight to the destination rather than finishing the move.
 useEffect(()=>{if((reduce||failed)&&flight)land(flight)},[reduce,failed]);
 // The ball canvas spans twice the ball's widest tracked diameter, so it is only ever scaled down.
 const S=Math.ceil(maxBallRadius*roomCover(width,height).scale*4);
 useEffect(()=>{
  if(!ref.current||!width||!height)return;
  setFailed(false);
  const canvas=ref.current;
  const aim=()=>{
   const {at,flight,width,height}=state.current;
   const frame=(flight?frameOf(fly.current,clipFrames(flight.key),false):frameOf(idle.current,clipFrames(idleKey(at)),true))??(flight?clipFrames(flight.key)[0]:stillFrame(at));
   const ball=ballOnScreen(frame,width,height);
   canvas.style.visibility=ball?'visible':'hidden';
   if(!ball)return null;
   const k=ball.r/(S/4);
   canvas.style.transform=`translate(${ball.x-S/2}px,${ball.y-S/2}px) scale(${k})`;
   // The render's depth of field and candle flicker, applied in the canvas's own (unscaled) pixels.
   canvas.style.filter=`blur(${(ball.blur/k).toFixed(2)}px) brightness(${(1+ball.flicker).toFixed(3)})`;
   return ball.dir;
  };
  try{scene.current=startScene(canvas,S,motion.current,spin,aim)}catch(error){setFailed(true);console.error('crystal ball scene',error)}
  return()=>{scene.current?.stop();scene.current=null};
 },[width,height]);
 useEffect(()=>{scene.current?.style(ball==='classic'?null:{glass:Asset.fromModule(ballArt[ball].glass).uri,clean:Asset.fromModule(ballArt[ball].clean).uri})},[ball,width,height]);
 // Reduced motion runs no loop, so each new resting spot or flight still gets one frame.
 useEffect(()=>{scene.current?.resume()},[reduce,at,flight]);
 const idleUrl=!reduce&&!failed&&!flight?clips.get(idleKey(at)):undefined;
 useEffect(()=>watchFrames(idle.current),[idleUrl]);
 // The room replaces the fog Atmosphere, so it publishes the same shell reduced-motion flag.
 useEffect(()=>{const shell=ref.current?.closest('[data-testid="app-shell"]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
 const fallback=failed?ballOnScreen(stillFrame(spot),width,height):null;
 // During a flight the destination still waits decoded behind the start still, so landing never flashes.
 const stills=failed?[spot]:flight?[flight.to,at]:[at];
 return <div aria-hidden="true" style={{position:'absolute',left:0,top:0,width,height,overflow:'hidden',pointerEvents:'none',background:'#050302'}}>
  {stills.map(s=><img key={s} alt="" src={Asset.fromModule(roomStills[s]).uri} style={fill}/>)}
  {idleUrl?<video key={idleUrl} ref={idle} src={idleUrl} muted playsInline autoPlay loop style={fill}/>:null}
  {flight&&!failed?<video key={flight.url} ref={fly} src={flight.url} muted playsInline autoPlay onEnded={()=>land(flight)} onError={()=>land(flight)} style={fill}/>:null}
  {/* Reduced motion's fade runs on the Web Animations API: the shell's reduced-motion rule stops CSS animations. */}
  {fading&&!failed?<img key={`fade-${fading}`} alt="" data-room-fade src={Asset.fromModule(roomStills[fading]).uri} ref={img=>{if(img&&!img.getAnimations().length)img.animate([{opacity:1},{opacity:0}],{duration:450,easing:'ease-out',fill:'forwards'}).finished.then(()=>setFading(null),()=>setFading(null))}} style={fill}/>:null}
  {/* a resize gets a fresh canvas because stop() loses the old context */}
  <canvas key={`${width}x${height}`} ref={ref} width={S} height={S} style={{position:'absolute',left:0,top:0,width:S,height:S,transformOrigin:'50% 50%',visibility:'hidden'}}/>
  {fallback?<div style={{position:'absolute',left:fallback.x-fallback.r,top:fallback.y-fallback.r,width:fallback.r*2,height:fallback.r*2,borderRadius:'50%',overflow:'hidden'}}><OrbVisual size={fallback.r*2} reduce ball={ball}/></div>:null}
  {/* lens: vignette, grade, grain */}
  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 75% 60% at 50% 38%, rgba(0,0,0,0) 50%, rgba(3,2,1,.6) 100%)'}}/>
  <div style={{position:'absolute',left:0,top:0,width:'100%',height:130,background:'linear-gradient(180deg, rgba(5,3,2,.75) 0%, rgba(5,3,2,0) 100%)'}}/>
  <div style={{position:'absolute',left:0,bottom:0,width:'100%',height:304,background:'linear-gradient(180deg, rgba(5,3,2,0) 0%, rgba(5,3,2,.55) 45%, rgba(5,3,2,.9) 100%)'}}/>
  <div style={{position:'absolute',inset:0,opacity:.09,mixBlendMode:'overlay'}} dangerouslySetInnerHTML={{__html:grain}}/>
  <style>{appCss}</style>
  <style>{'@keyframes cbBreath{0%,100%{box-shadow:0 0 14px rgba(255,170,90,.45)}50%{box-shadow:0 0 22px rgba(255,170,90,.75)}}'}</style>
 </div>;
}

// The canvas tab bar's Ask orb; RoomScene supplies its breathing keyframes.
export function AskOrb({reduce}:{reduce:boolean}){
 return <span aria-hidden="true" style={{display:'block',width:26,height:26,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%, rgba(255,246,226,.95) 0%, rgba(255,246,226,0) 18%), radial-gradient(circle at 50% 60%, #f0b066 0%, #8a4a22 45%, #1e110a 85%)',boxShadow:'0 0 14px rgba(255,170,90,.45)',animation:reduce?'none':'cbBreath 4s ease-in-out infinite'}}/>;
}
