import {useEffect,useRef} from 'react';
import * as T from 'three';

// Ported from the Claude Design canvas artboard project/Main.dc.html ("Home - realistic").
// Keep the scene identical to that source; only lifecycle, sizing and reduced motion are app-specific.
function startScene(canvas:HTMLCanvasElement,W:number,H:number,motion:{reduce:boolean}){
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
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.setSize(W,H,false);
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.2;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;
 renderer.setClearColor(0x050302,1);

 const scene=new T.Scene();
 scene.fog=new T.FogExp2(0x060403,0.06);
 const camera=new T.PerspectiveCamera(38,W/H,0.1,60);
 const camBase=new T.Vector3(0,2.25,8.4);
 const target=new T.Vector3(0,0.55,0);
 camera.position.copy(camBase);
 camera.lookAt(target);
 const BALL=new T.Vector3(0,1.55,0);

 // ---------- textures ----------
 const bgTex=mk(1024,768,(g,w,h)=>{
  const lg=g.createLinearGradient(0,0,0,h);
  lg.addColorStop(0,'#080504');lg.addColorStop(0.6,'#170d07');lg.addColorStop(1,'#100904');
  g.fillStyle=lg;g.fillRect(0,0,w,h);
  const rg=g.createRadialGradient(w*0.5,h*0.7,10,w*0.5,h*0.7,w*0.6);
  rg.addColorStop(0,'rgba(110,62,28,.5)');rg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=rg;g.fillRect(0,0,w,h);
  const rows=[0.34,0.56,0.78];
  g.filter='blur(7px)';
  rows.forEach(y=>{
   for(let x=10;x<w;x+=26+rnd()*42){
    const bh=50+rnd()*80,bw=20+rnd()*26;
    g.fillStyle='rgba('+(16+rnd()*18|0)+','+(10+rnd()*8|0)+',6,.85)';
    g.fillRect(x,h*y-bh,bw,bh);
    g.fillRect(x+bw*0.35,h*y-bh-18,bw*0.3,20);
   }
  });
  g.filter='blur(12px)';
  rows.forEach(y=>{
   g.fillStyle='rgba(160,100,52,.22)';g.fillRect(0,h*y-2,w,6);
   g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,h*y+6,w,30);
  });
  g.filter='blur(1.5px)';
  for(let i=0;i<90;i++){
   const y0=h*rows[i%3];
   const x=rnd()*w,y=y0-14-rnd()*90,r=5+rnd()*20,a=0.06+rnd()*0.26,k=rnd();
   const col=k>0.82?'255,218,160':(k>0.3?'255,158,72':'170,110,86');
   const bg=g.createRadialGradient(x,y,0,x,y,r);
   bg.addColorStop(0,'rgba('+col+','+(a*0.8)+')');
   bg.addColorStop(0.82,'rgba('+col+','+a+')');
   bg.addColorStop(1,'rgba('+col+',0)');
   g.fillStyle=bg;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  }
  g.filter='blur(4px)';
  ([[0.86,0.42,46],[0.12,0.6,30]] as const).forEach(([fx,fy,r])=>{
   const x=w*fx,y=h*fy,bg=g.createRadialGradient(x,y,0,x,y,r);
   bg.addColorStop(0,'rgba(255,190,110,.55)');bg.addColorStop(0.8,'rgba(255,160,80,.4)');bg.addColorStop(1,'rgba(255,150,70,0)');
   g.fillStyle=bg;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  });
  g.filter='none';
 });

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
 const back=new T.Mesh(new T.PlaneGeometry(17,9.6),new T.MeshBasicMaterial({map:bgTex,fog:false}));
 back.position.set(0,3.3,-6.5);
 scene.add(back);

 const table=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({map:woodTex,roughness:0.66,metalness:0,envMapIntensity:0.4}));
 table.rotation.x=-Math.PI/2;
 table.receiveShadow=true;
 scene.add(table);

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
 const moon=new T.DirectionalLight(0x9fb6ff,0.45);
 moon.position.set(-3.5,4.2,3.5);scene.add(moon);
 scene.add(new T.HemisphereLight(0x3a2a1c,0x080503,0.35));

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
  uGlowCol:{value:new T.Color(0xffb46a)},uMist:{value:new T.Color(0x6a3a8a)}
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
   uniform samplerCube uEnv; uniform float uTime, uSwirl, uGlow, uRadius;
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
    float r = length(p);
    float ang = uSwirl*(1.35 - r) + p.y*1.8;
    float cs = cos(ang), sn = sin(ang);
    vec3 q = vec3(cs*p.x - sn*p.z, p.y*1.3, sn*p.x + cs*p.z);
    float n = fbm(q*2.1 + vec3(0.0, uTime*0.04, 0.0));
    float fil = exp(-pow((n - 0.6)*22.0, 2.0)) + 0.2*smoothstep(0.64, 0.8, n);
    return fil * smoothstep(0.98, 0.5, r) * smoothstep(0.08, 0.32, r);
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
    vec3 L = normalize(uLightPos - vWorld);
    vec3 Hh = normalize(L - V);
    vec3 spec = uLightCol * (pow(max(dot(N, Hh), 0.0), 1400.0)*14.0 + pow(max(dot(N, Hh), 0.0), 90.0)*0.25);
    col = mix(col, refl, F) + spec;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const ball=new T.Mesh(new T.SphereGeometry(1,128,96),ballMat);
 ball.position.copy(BALL);
 scene.add(ball);

 const halo=new T.Sprite(new T.SpriteMaterial({map:haloTex,color:0xffb46a,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,opacity:0.16,toneMapped:false}));
 halo.position.copy(BALL);halo.scale.set(3.7,3.7,1);halo.renderOrder=10;
 scene.add(halo);

 // drifting dust in the candlelight
 const NDUST=220,dpos=new Float32Array(NDUST*3),dspd:number[]=[];
 for(let i=0;i<NDUST;i++){
  let x,y,z;
  do{x=(rnd()-0.5)*3.4;y=0.2+rnd()*3;z=(rnd()-0.5)*3}while(Math.hypot(x,y-BALL.y,z)<1.1);
  dpos.set([x,y,z],i*3);dspd.push(0.02+rnd()*0.05,rnd()*6.28);
 }
 const dgeo=new T.BufferGeometry();dgeo.setAttribute('position',new T.BufferAttribute(dpos,3));
 const dust=new T.Points(dgeo,new T.PointsMaterial({map:dotTex,color:0xffd6a0,size:0.028,transparent:true,opacity:0.5,depthWrite:false,blending:T.AdditiveBlending}));
 scene.add(dust);

 // ---------- input ----------
 const mouse={x:0,y:0},sm={x:0,y:0};
 const onMove=(e:PointerEvent)=>{
  const b=canvas.getBoundingClientRect();
  if(!b.width)return;
  mouse.x=Math.max(-1,Math.min(1,((e.clientX-b.left)/b.width-0.5)*2));
  mouse.y=Math.max(-1,Math.min(1,((e.clientY-b.top)/b.height-0.5)*2));
 };
 const onTilt=(e:DeviceOrientationEvent)=>{
  if(e.gamma==null||e.beta==null)return;
  mouse.x=Math.max(-1,Math.min(1,e.gamma/25));
  mouse.y=Math.max(-1,Math.min(1,(e.beta-45)/25));
 };
 window.addEventListener('pointermove',onMove);
 window.addEventListener('deviceorientation',onTilt);

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

  sm.x+=(mouse.x-sm.x)*Math.min(1,dt*2.5);
  sm.y+=(mouse.y-sm.y)*Math.min(1,dt*2.5);
  camera.position.set(camBase.x+sm.x*0.35,camBase.y-sm.y*0.18,camBase.z);
  camera.lookAt(target);

  const fl=reduced?1:0.86+0.07*Math.sin(t*13.1)+0.05*Math.sin(t*23.7+1.3)+0.04*Math.sin(t*7.3+0.4);
  candle.intensity=7*fl;
  flame.scale.set(0.1*(1+0.05*Math.sin(t*17.3)),0.24*(0.92+0.1*fl),1);
  flame.position.x=CX+0.006*Math.sin(t*9.1);
  flameGlow.material.opacity=0.2*fl;

  const g=1+0.07*Math.sin(t*1.3);
  uniforms.uTime.value=t;uniforms.uSwirl.value=swirl;uniforms.uGlow.value=g;
  inner.intensity=1.6*g;
  halo.material.opacity=0.13*g;

  if(!reduced){
   const a=dgeo.attributes.position.array as Float32Array;
   for(let i=0;i<NDUST;i++){
    a[i*3+1]+=dspd[i*2]*dt*0.35;
    a[i*3]+=Math.sin(t*0.4+dspd[i*2+1])*dt*0.02;
    if(a[i*3+1]>3.2)a[i*3+1]=0.2;
   }
   dgeo.attributes.position.needsUpdate=true;
  }

  if(n===0){
   renderer.shadowMap.needsUpdate=true;
   capture();
   scene.environment=pmrem.fromCubemap(cubeRT.texture).texture;
   capture();
  }else if(n%2===0)capture();
  n++;
  renderer.render(scene,camera);
  // Reduced motion and hidden pages hold the last frame without scheduling callbacks.
  if(!reduced&&!document.hidden)raf=requestAnimationFrame(frame);
 };
 const resume=()=>{if(alive&&!raf&&!document.hidden){clock.getDelta();raf=requestAnimationFrame(frame)}};
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else resume()};
 document.addEventListener('visibilitychange',visibility);
 frame();
 return {
  resume,
  stop(){
   alive=false;cancelAnimationFrame(raf);
   window.removeEventListener('pointermove',onMove);
   window.removeEventListener('deviceorientation',onTilt);
   document.removeEventListener('visibilitychange',visibility);
   pmrem.dispose();renderer.dispose();renderer.forceContextLoss();
  }
 };
}

const grain=`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><filter id="cbGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#cbGrain)"/></svg>`;

export function HomeScene({width,height,reduce}:{width:number;height:number;reduce:boolean}){
 const ref=useRef<HTMLCanvasElement>(null),motion=useRef({reduce}),scene=useRef<ReturnType<typeof startScene>|null>(null);
 motion.current.reduce=reduce;
 useEffect(()=>{
  if(!ref.current||!width||!height)return;
  try{scene.current=startScene(ref.current,width,height,motion.current)}catch(error){console.error('crystal ball scene',error)}
  return()=>{scene.current?.stop();scene.current=null};
 },[width,height]);
 useEffect(()=>{if(!reduce)scene.current?.resume()},[reduce]);
 // Home replaces the fog Atmosphere, so it publishes the same shell reduced-motion flag.
 useEffect(()=>{const shell=ref.current?.closest('[data-testid="app-shell"]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
 return <div aria-hidden="true" style={{position:'absolute',left:0,top:0,width,height,pointerEvents:'none',background:'#050302'}}>
  {/* real-time 3D scene; a resize gets a fresh canvas because stop() loses the old context */}
  <canvas key={`${width}x${height}`} ref={ref} width={width} height={height} style={{position:'absolute',left:0,top:0,width,height,display:'block'}}/>
  {/* lens: vignette, grade, grain */}
  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 75% 60% at 50% 38%, rgba(0,0,0,0) 50%, rgba(3,2,1,.6) 100%)'}}/>
  <div style={{position:'absolute',left:0,top:0,width:'100%',height:130,background:'linear-gradient(180deg, rgba(5,3,2,.75) 0%, rgba(5,3,2,0) 100%)'}}/>
  <div style={{position:'absolute',left:0,bottom:0,width:'100%',height:304,background:'linear-gradient(180deg, rgba(5,3,2,0) 0%, rgba(5,3,2,.55) 45%, rgba(5,3,2,.9) 100%)'}}/>
  <div style={{position:'absolute',inset:0,opacity:.09,mixBlendMode:'overlay'}} dangerouslySetInnerHTML={{__html:grain}}/>
  <style>{'@keyframes cbBreath{0%,100%{box-shadow:0 0 14px rgba(255,170,90,.45)}50%{box-shadow:0 0 22px rgba(255,170,90,.75)}}'}</style>
 </div>;
}

// The canvas tab bar's Ask orb; HomeScene supplies its breathing keyframes.
export function AskOrb({reduce}:{reduce:boolean}){
 return <span aria-hidden="true" style={{display:'block',width:26,height:26,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%, rgba(255,246,226,.95) 0%, rgba(255,246,226,0) 18%), radial-gradient(circle at 50% 60%, #f0b066 0%, #8a4a22 45%, #1e110a 85%)',boxShadow:'0 0 14px rgba(255,170,90,.45)',animation:reduce?'none':'cbBreath 4s ease-in-out infinite'}}/>;
}
