import * as T from 'three';
import {Asset} from 'expo-asset';
import {envTexture,startGlass,type GlassOptions} from './glassBall';
import {ballEnv} from './roomAssets';
import type {BallSpin} from './RoomScene';

// The glass ball on a page canvas of S×S CSS pixels.
let envJob:Promise<ArrayBuffer>|null=null;
const ballEnvBytes=()=>envJob??=fetch(Asset.fromModule(ballEnv).uri).then(r=>{if(!r.ok)throw new Error(`ball environment: ${r.status}`);return r.arrayBuffer()}).catch(error=>{envJob=null;throw error});

export async function startWebGlass(canvas:HTMLCanvasElement,S:number,options:Omit<GlassOptions,'env'|'present'|'hidden'|'load'>,grip?:BallSpin){
 const env=envTexture(await ballEnvBytes());
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.setSize(S,S,false);
 const loader=new T.TextureLoader();
 let glass:ReturnType<typeof startGlass>;
 try{
  glass=startGlass(renderer,{...options,env,hidden:()=>document.hidden,
   load:asset=>loader.loadAsync(Asset.fromModule(asset).uri).then(texture=>{texture.colorSpace=T.SRGBColorSpace;return texture})},grip);
 }catch(error){renderer.dispose();renderer.forceContextLoss();throw error}
 // The ball's own pointer-down grabs it; the drag follows the pointer anywhere on the page.
 const drag=(e:PointerEvent)=>grip?.drag?.(e),release=(e:PointerEvent)=>grip?.release?.(e);
 if(grip){
  const grab=grip.grab;
  grip.grab=e=>{grab?.(e);try{((e as PointerEvent).target as Element).setPointerCapture(e.pointerId)}catch(err){}};
  window.addEventListener('pointermove',drag);
  window.addEventListener('pointerup',release);
  window.addEventListener('pointercancel',release);
 }
 const visibility=()=>{if(document.hidden)glass.pause();else glass.resume()};
 document.addEventListener('visibilitychange',visibility);
 return {...glass,stop(){
  glass.stop();
  window.removeEventListener('pointermove',drag);
  window.removeEventListener('pointerup',release);
  window.removeEventListener('pointercancel',release);
  document.removeEventListener('visibilitychange',visibility);
  renderer.forceContextLoss();
 }};
}
