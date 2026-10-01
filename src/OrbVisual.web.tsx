import {useId} from 'react';
import {orbMarkup} from './designArt';
export function OrbVisual({size,phase}:{size:number;phase?:string;reduce?:boolean}){
 const id=useId().replace(/[^a-z0-9]/gi,'');
 const markup=orbMarkup.replace(/id="([^"]+)"/g,`id="$1-${id}"`).replace(/url\(#([^)]+)\)/g,`url(#$1-${id})`).replace('orb hero',`orb ${size>60?'hero':''} ${phase==='reveal'?'bright':''}`);
 return <div aria-hidden="true" style={{width:size,height:size*1.125,'--s':`${size}px`} as React.CSSProperties} dangerouslySetInnerHTML={{__html:markup}}/>;
}
