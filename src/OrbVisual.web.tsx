import {useId} from 'react';
import {Asset} from 'expo-asset';
import {orbMarkup} from './designArt';
import {ballArt} from './roomAssets';
import type {BallStyle} from './types';
// A Plus ball style shows its AI-rendered disc over the orb, as on native.
export function OrbVisual({size,phase,ball='classic'}:{size:number;phase?:string;reduce?:boolean;ball?:BallStyle}){
 const id=useId().replace(/[^a-z0-9]/gi,'');
 const markup=orbMarkup.replace(/id="([^"]+)"/g,`id="$1-${id}"`).replace(/url\(#([^)]+)\)/g,`url(#$1-${id})`).replace('orb hero',`orb ${size>60?'hero':''} ${phase==='reveal'?'bright':''}`);
 return <div aria-hidden="true" style={{position:'relative',width:size,height:size*1.125,'--s':`${size}px`} as React.CSSProperties}>
  <div dangerouslySetInnerHTML={{__html:markup}}/>
  {ball!=='classic'?<img data-testid="orb-style" alt="" src={Asset.fromModule(ballArt[ball].glass).uri} style={{position:'absolute',left:0,top:0,width:size,height:size,borderRadius:'50%'}}/>:null}
 </div>;
}
