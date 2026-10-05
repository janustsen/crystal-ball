import {Image,View} from 'react-native';
import {SvgXml} from 'react-native-svg';

// Native has no DOM canvas for the three.js scene, so it shows a 600×844 frame captured from the web scene
// (scripts/capture-home-scene.mjs). Height-fit and centred keeps the ball where the live camera puts it.
export function HomeScene({width,height}:{width:number;height:number;reduce:boolean}){
 const w=height*600/844;
 return <View pointerEvents="none" style={{position:'absolute',left:0,top:0,width,height,overflow:'hidden',backgroundColor:'#050302'}}><Image source={require('../assets/home-scene.jpg')} style={{position:'absolute',top:0,left:(width-w)/2,width:w,height}}/></View>;
}

const orb='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26"><defs><radialGradient id="b" cx="50%" cy="60%" r="70.7%"><stop offset="0" stop-color="#f0b066"/><stop offset=".45" stop-color="#8a4a22"/><stop offset=".85" stop-color="#1e110a"/></radialGradient><radialGradient id="h" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff6e2" stop-opacity=".95"/><stop offset=".18" stop-color="#fff6e2" stop-opacity="0"/></radialGradient></defs><circle cx="13" cy="13" r="13" fill="url(#b)"/><circle cx="13" cy="13" r="13" fill="url(#h)"/></svg>';
export function AskOrb(_:{reduce:boolean}){
 return <View style={{width:26,height:26,borderRadius:13,boxShadow:'0 0 14px rgba(255,170,90,.45)'}}><SvgXml xml={orb} width={26} height={26}/></View>;
}
