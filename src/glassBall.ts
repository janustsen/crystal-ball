import * as T from 'three';
import type {BallSpin} from './RoomScene';

// The glass ball, ported from the Claude Design canvas artboard project/Library.dc.html ("Library"), with the warmer,
// brighter and busier fog of its "Home — realistic" artboard (docs/design/motion.md#room). Its library room only lights and reflects in the glass: scripts/bake-ball-env.mjs captures
// the room as a cube map from the ball's centre (assets/room/ball-env.bin), which the web and native scenes share.
export const BALL=new T.Vector3(0,1.55,0);
const CANDLE=new T.Vector3(-1.22,1.13,-1.15);
export const ENV_SIZE=256;
// The canvas's original camera distance (so fog and halo read the same); the ball fills half the canvas.
const CAM_D=8.43,FILL=0.5;

// The baked environment: six HalfFloat RGBA faces (see scripts/ball-env-room.ts).
export function envTexture(buffer:ArrayBuffer){
 const data=new Uint16Array(buffer),face=ENV_SIZE*ENV_SIZE*4;
 if(data.length!==face*6)throw new Error(`ball environment has ${data.length} texels, expected ${face*6}`);
 const env=new T.CubeTexture(Array.from({length:6},(_,i)=>new T.DataTexture(data.slice(i*face,(i+1)*face),ENV_SIZE,ENV_SIZE,T.RGBAFormat,T.HalfFloatType)));
 env.format=T.RGBAFormat;env.type=T.HalfFloatType;env.minFilter=T.LinearMipmapLinearFilter;env.magFilter=T.LinearFilter;
 env.needsUpdate=true;
 return env;
}

// A white radial gradient's alpha (canvas createRadialGradient stops), as a texture both platforms can build.
export function radialAlpha(stops:[number,number][],size=256){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=Math.min(1,Math.hypot(x+.5-size/2,y+.5-size/2)/(size/2));
  const k=stops.findIndex(s=>s[0]>=d),[d0,a0]=stops[Math.max(0,k-1)],[d1,a1]=stops[k];
  const i=(y*size+x)*4;data.set([255,255,255,Math.round(255*(d1>d0?a0+(a1-a0)*(d-d0)/(d1-d0):a1))],i);
 }
 const t=new T.DataTexture(data,size,size);
 t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
 return t;
}

export type Pointer={pointerId:number;clientX:number;clientY:number};
export type GlassOptions={
 env:T.CubeTexture;motion:{reduce:boolean};
 // Before every frame: the camera's direction from the ball, or null while the ball is out of frame.
 aim:()=>number[]|null;
 // The platform's frame end (expo-gl presents explicitly) and whether the app is hidden (no frames then).
 present?:()=>void;hidden:()=>boolean;
 // A Plus style's disc texture (a bundled image module), loaded by the platform.
 load:(asset:number)=>Promise<T.Texture>;
 // Extra per-frame animation, given the time and the frame's glow.
 decorate?:(scene:T.Scene,camera:T.Camera)=>(t:number,glow:number)=>void;
};

export function startGlass(renderer:T.WebGLRenderer,{env,motion,aim,present,hidden,load,decorate}:GlassOptions,grip?:BallSpin){
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.2;
 renderer.setClearColor(0x000000,0);
 // A shader that fails to compile throws, so the scene falls back to the static orb instead of drawing nothing.
 renderer.debug.onShaderError=()=>{throw new Error('crystal ball shader failed to compile')};

 const scene=new T.Scene();
 scene.fog=new T.FogExp2(0x060403,0.06);
 const camera=new T.PerspectiveCamera(2*Math.atan(Math.tan(Math.asin(1/CAM_D))/FILL)*180/Math.PI,1,0.1,60);
 const haloTex=radialAlpha([[0,.18],[.45,.5],[.58,.32],[1,0]]);

 const uniforms={
  uEnv:{value:env},
  uTime:{value:0},uSwirl:{value:0},uGlow:{value:1},
  uCenter:{value:BALL.clone()},uRadius:{value:1},
  uLightPos:{value:CANDLE.clone()},uLightCol:{value:new T.Color(0xffb070)},
  uGlowCol:{value:new T.Color(0xffc48e)},uMist:{value:new T.Color(0x9c5646)},
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
    // Two fog layers drifting against each other keep it visibly churning, as in the Home (realistic) reference.
    vec3 drift = vec3(uTime*0.08, uTime*0.28, -uTime*0.06);
    float n = fbm(q*1.8 + drift);
    float m = 0.62*noise(q*3.4 - drift*1.7 + vec3(4.0)) + 0.38*noise(q*6.9 + drift*1.2);
    float fil = exp(-pow((n - 0.58)*14.0, 2.0)) + 0.25*smoothstep(0.55, 0.8, n) + 0.45*smoothstep(0.55, 0.85, m);
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
     // The view rotation's inverse is its transpose (GLSL ES 1.0 has no transpose()).
     mat3 world = mat3(view[0][0], view[1][0], view[2][0], view[0][1], view[1][1], view[2][1], view[0][2], view[1][2], view[2][2]);
     vec2 b = (view*(uRot*(world*vec3(a, sqrt(max(0.64 - ra*ra, 0.0)))))).xy;
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
     // Dense fog glows cream; thin wisps and the outer shell fall to a dusky rose.
     vec3 col = mix(uMist, uGlowCol*1.35, smoothstep(0.18, 0.65, d) * (1.0 - 0.6*smoothstep(0.55, 1.0, r)));
     float lit = 0.3 + 2.0*exp(-pow(r*1.8, 2.0));
     acc += trans * d * col * lit * uGlow * dt * 2.0;
     acc += trans * uGlowCol * 0.16 * exp(-pow(r*2.4, 2.0)) * uGlow * dt;
     trans *= exp(-d * dt * 3.2);
    }
    vec3 col = refr*0.9*(0.3 + 0.7*trans) + acc;
    col = mix(col, refl, F) + spec;
    gl_FragColor = vec4(tone(col), 1.0);
    #include <colorspace_fragment>
   }`
 });
 const ball=new T.Mesh(new T.SphereGeometry(1,64,32),ballMat);
 ball.position.copy(BALL);
 scene.add(ball);

 const halo=new T.Sprite(new T.SpriteMaterial({map:haloTex,color:0xffb46a,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,opacity:0.16,toneMapped:false}));
 halo.position.copy(BALL);halo.scale.set(3.7,3.7,1);halo.renderOrder=10;
 scene.add(halo);
 const extra=decorate?.(scene,camera);

 const KROT=0.011,VMAX=14;
 const spin={dragging:false,id:-1,lx:0,ly:0,lt:0,ax:0,ay:0,vx:0,vy:0,orb:0,moved:0};

 // ---------- drag to spin ----------
 if(grip){
  grip.grab=e=>{
   // A second finger leaves the first one's drag alone.
   if(spin.dragging)return;
   spin.dragging=true;spin.id=e.pointerId;spin.lx=e.clientX;spin.ly=e.clientY;spin.moved=0;
   spin.ax=0;spin.ay=0;spin.vx=0;spin.vy=0;spin.lt=performance.now();
   grip.dragged=false;
  };
  grip.drag=e=>{
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
   if(motion.reduce)wake();
  };
  grip.release=e=>{
   if(!spin.dragging||e.pointerId!==spin.id)return;
   spin.dragging=false;
   // Reduced motion keeps the hand's turn but drops the coasting spin afterwards.
   if(motion.reduce||performance.now()-spin.lt>90){spin.vx=0;spin.vy=0}
   // The ball's press, if any, follows this release; after it no drag may swallow a later activation.
   setTimeout(()=>{if(grip.release===owned?.release)grip.dragged=false});
  };
 }
 const owned=grip?{grab:grip.grab,drag:grip.drag,release:grip.release}:null;
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
 let t=0,swirl=0,raf=0,alive=true;
 const frame=()=>{
  raf=0;
  if(!alive||hidden())return;
  const reduced=motion.reduce;
  const dt=Math.min(clock.getDelta(),0.05);
  t+=dt;
  swirl+=dt*(reduced?0.03:0.5);

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
  halo.material.opacity=0.13*g;
  extra?.(t,g);

  if(dir&&!hidden()){renderer.render(scene,camera);if(!hidden())present?.()}
  // Reduced motion and a hidden app hold the last frame without scheduling callbacks.
  if(!reduced&&!hidden())raf=requestAnimationFrame(frame);
 };
 function wake(){if(alive&&!raf&&!hidden())raf=requestAnimationFrame(frame)}
 const resume=()=>{if(alive&&!raf&&!hidden()){clock.getDelta();raf=requestAnimationFrame(frame)}};
 const textures=new Map<number,Promise<T.Texture>>();
 let look=0;
 const api={
  resume,
  pause(){cancelAnimationFrame(raf);raf=0},
  // null is Classic; otherwise the style's glass and clean discs (src/roomAssets.ts), shown once both have loaded.
  style(art:{glass:number;clean:number}|null){
   const id=++look;
   uniforms.uStyled.value=0;uniforms.uStyle.value=uniforms.uClean.value=null;
   resume();
   if(!art)return;
   const get=(asset:number)=>{let texture=textures.get(asset);if(!texture){texture=load(asset);textures.set(asset,texture)}return texture};
   Promise.all([get(art.glass),get(art.clean)]).then(([glass,clean])=>{
    if(id!==look||!alive)return;
    uniforms.uStyle.value=glass;uniforms.uClean.value=clean;uniforms.uStyled.value=1;resume();
   },error=>console.warn('ball style unavailable',error));
  },
  stop(){
   alive=false;cancelAnimationFrame(raf);
   if(grip&&owned){
    if(grip.grab===owned.grab)grip.grab=undefined;
    if(grip.drag===owned.drag)grip.drag=undefined;
    if(grip.release===owned.release)grip.release=undefined;
   }
   textures.forEach(texture=>texture.then(t=>t.dispose(),()=>{}));
   env.dispose();haloTex.dispose();renderer.dispose();
  }
 };
 // Compile the ball up front (one hidden draw from straight on), so a shader failure surfaces here rather than in a
 // later animation frame, even while the ball is out of frame.
 try{camera.position.set(0,0,CAM_D).add(BALL);camera.lookAt(BALL);if(!hidden())renderer.render(scene,camera);frame()}catch(error){api.stop();throw error}
 return api;
}
