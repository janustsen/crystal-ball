import {Image} from 'react-native';
// Native SVG does not implement feTurbulence; this is the same artwork rendered at build time.
export function OrbVisual({size}:{size:number;phase?:string}){return <Image source={require('../assets/orb.png')} style={{width:size,height:size*1.125}}/>}
