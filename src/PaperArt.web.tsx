import {Asset} from 'expo-asset';
const parchment=Asset.fromModule(require('../assets/apothecary/paper.webp')).uri;
const writing=Asset.fromModule(require('../assets/apothecary/parchment.jpg')).uri;
// Nine-slice edges keep their painted proportions when a reading grows taller.
export function PaperArt({plain=false}:{plain?:boolean}){return <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',...(plain?{backgroundColor:'#dec9a2',backgroundImage:`url("${writing}")`,backgroundSize:'cover',boxShadow:'inset 0 2px 8px #5c3b1925',clipPath:'polygon(1% 2%,28% 0,63% 1%,99% 0,100% 98%,72% 100%,39% 99%,0 100%)'}:{borderStyle:'solid',borderColor:'transparent',borderWidth:0,borderImageSource:`url("${parchment}")`,borderImageSlice:'65 90 fill',borderImageWidth:'9px 12px',borderImageRepeat:'stretch'})}}/>}
