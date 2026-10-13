import * as T from 'three';
import {Asset} from 'expo-asset';
import {envTexture,startGlass,type GlassOptions} from './glassBall';
import {ballEnv} from './roomAssets';
import type {BallSpin} from './RoomScene';

// The glass ball on a page canvas of S×S CSS pixels.
let envJob:Promise<ArrayBuffer>|null=null;
const ballEnvBytes=()=>envJob??=fetch(Asset.fromModule(ballEnv).uri).then(r=>{if(!r.ok)throw new Error(`ball environment: ${r.status}`);return r.arrayBuffer()}).catch(error=>{envJob=null;throw error});

export async function startWebGlass(canvas:HTMLCanvasElement,S:number,options:Omit<GlassOptions,'env'|'present'|'hidden'|'load'>&{signal:AbortSignal},grip?:BallSpin){
 const bytes=await ballEnvBytes();
 if(options.signal.aborted)return null;
 const env=envTexture(bytes);
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
 const grab=grip?.grab,drag=grip?.drag,release=grip?.release;
 const capture=(e:Parameters<NonNullable<BallSpin['grab']>>[0])=>{grab?.(e);try{((e as PointerEvent).target as Element).setPointerCapture(e.pointerId)}catch(err){}};
 if(grip&&drag&&release){
  grip.grab=capture;
  window.addEventListener('pointermove',drag);
  window.addEventListener('pointerup',release);
  window.addEventListener('pointercancel',release);
 }
 const visibility=()=>{if(document.hidden)glass.pause();else glass.resume()};
 document.addEventListener('visibilitychange',visibility);
 // The Ask camera enlarges the canvas: draw more pixels to match, so the zoomed glass stays sharp.
 return {...glass,sharpen(zoom:number){renderer.setPixelRatio(Math.min(4,Math.min(window.devicePixelRatio||1,1.75)*zoom));renderer.setSize(S,S,false);glass.resume()},stop(){
  if(grip?.grab===capture)grip.grab=grab;
  glass.stop();
  if(drag)window.removeEventListener('pointermove',drag);
  if(release)window.removeEventListener('pointerup',release);
  if(release)window.removeEventListener('pointercancel',release);
  document.removeEventListener('visibilitychange',visibility);
  renderer.forceContextLoss();
 }};
}
