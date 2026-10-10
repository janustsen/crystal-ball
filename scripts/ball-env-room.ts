// Bakes the glass ball's environment: the library room of the Claude Design canvas artboard project/Library.dc.html
// ("Library"), captured as a cube map from the ball's centre. Keep the room identical to that source; the app's ball
// (src/glassBall.ts) only reflects and refracts it. Runs in Chrome via scripts/bake-ball-env.mjs.
import * as T from 'three';
import {BALL,ENV_SIZE} from '../src/glassBall';

// The HalfFloat cube faces in order (+x, -x, +y, -y, +z, -z), each ENV_SIZE² RGBA texels bottom row first.
export function bakeEnv(canvas:HTMLCanvasElement){
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
 const renderer=new T.WebGLRenderer({canvas});
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;

 const scene=new T.Scene();
 scene.fog=new T.FogExp2(0x060403,0.06);

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


 // ---------- capture ----------
 const cubeRT=new T.WebGLCubeRenderTarget(ENV_SIZE,{type:T.HalfFloatType});
 const cubeCam=new T.CubeCamera(0.05,40,cubeRT);
 cubeCam.position.copy(BALL);scene.add(cubeCam);
 // Twice, as the live scene did: the second pass sees the room's own reflections of the first.
 renderer.shadowMap.needsUpdate=true;
 cubeCam.update(renderer,scene);
 scene.environment=new T.PMREMGenerator(renderer).fromCubemap(cubeRT.texture).texture;
 cubeCam.update(renderer,scene);
 // Read as float (always readable from a float target) and store as the half floats the target holds, losslessly.
 const gl=renderer.getContext(),face=new Float32Array(ENV_SIZE*ENV_SIZE*4),out=new Uint16Array(face.length*6);
 for(let i=0;i<6;i++){
  renderer.setRenderTarget(cubeRT,i);
  gl.readPixels(0,0,ENV_SIZE,ENV_SIZE,gl.RGBA,gl.FLOAT,face);
  face.forEach((v,j)=>{out[i*face.length+j]=T.DataUtils.toHalfFloat(v)});
 }
 renderer.setRenderTarget(null);
 return out;
}
