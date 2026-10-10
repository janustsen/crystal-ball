import * as T from 'three';
import {AppState} from 'react-native';
import {Asset} from 'expo-asset';
import {File} from 'expo-file-system';
import type {ExpoWebGLRenderingContext} from 'expo-gl';
import {envTexture,startGlass,type GlassOptions} from './glassBall';
import {ballEnv} from './roomAssets';
import type {BallSpin} from './RoomScene';

// The glass ball on an expo-gl context: three.js draws into the GLView's drawing buffer, presented once per frame.
let envJob:Promise<ArrayBuffer>|null=null;
const ballEnvBytes=()=>envJob??=Asset.fromModule(ballEnv).downloadAsync().then(asset=>new File(asset.localUri!).arrayBuffer()).catch(error=>{envJob=null;throw error});

// expo-gl decodes a bundled image (file:// localUri) straight into the texture.
function loadTexture(module:number){
 return Asset.fromModule(module).downloadAsync().then(asset=>{
  const texture=new T.DataTexture({localUri:asset.localUri} as unknown as BufferSource,asset.width!,asset.height!);
  texture.flipY=true;texture.colorSpace=T.SRGBColorSpace;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;
  texture.needsUpdate=true;
  return texture as T.Texture;
 });
}

// iOS ends an app that draws GL in the background, so frames stop there.
const hidden=()=>AppState.currentState!=='active';

export async function startNativeGlass(gl:ExpoWebGLRenderingContext,options:Omit<GlassOptions,'env'|'present'|'hidden'|'load'>&{signal:AbortSignal},grip?:BallSpin){
 const bytes=await ballEnvBytes();
 while(hidden()&&!options.signal.aborted){
  await new Promise<void>(resolve=>{
   const done=()=>{watch.remove();options.signal.removeEventListener('abort',done);resolve()};
   const watch=AppState.addEventListener('change',state=>{if(state==='active')done()});
   options.signal.addEventListener('abort',done,{once:true});
   if(options.signal.aborted||!hidden())done();
  });
 }
 if(options.signal.aborted)return null;
 const env=envTexture(bytes);
 // expo-gl logs every pixelStorei it lacks (three.js sets premultiply and colour-space conversion per upload).
 const pixelStorei=gl.pixelStorei.bind(gl);
 gl.pixelStorei=(name,value)=>{if(name===gl.UNPACK_FLIP_Y_WEBGL||name===gl.UNPACK_ALIGNMENT)pixelStorei(name,value)};
 const {drawingBufferWidth:width,drawingBufferHeight:height}=gl;
 const canvas={width,height,style:{},clientWidth:width,clientHeight:height,addEventListener(){},removeEventListener(){}} as unknown as HTMLCanvasElement;
 const renderer=new T.WebGLRenderer({canvas,context:gl as unknown as WebGLRenderingContext,antialias:true});
 renderer.setPixelRatio(1);
 renderer.setSize(width,height,false);
 const glass=startGlass(renderer,{...options,env,present:()=>gl.endFrameEXP(),hidden,load:loadTexture},grip);
 const watch=AppState.addEventListener('change',state=>{if(state==='active')glass.resume();else glass.pause()});
 return {...glass,stop(){watch.remove();glass.stop()}};
}
