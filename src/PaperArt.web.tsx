import {Asset} from 'expo-asset';
const parchment=Asset.fromModule(require('../assets/apothecary/paper.webp')).uri;
// Nine-slice edges keep their painted proportions when a reading grows taller.
export function PaperArt(){return <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',borderStyle:'solid',borderColor:'transparent',borderWidth:0,borderImageSource:`url("${parchment}")`,borderImageSlice:'65 90 fill',borderImageWidth:'14px 18px',borderImageRepeat:'stretch'}}/>}
