import {useEffect,useRef} from 'react';
import {Animated,AppState,Easing,Image,View} from 'react-native';
// Painted room reflections sit above the smoke; the stand occludes the lower glass.
export function OrbVisual({size,reduce=false,phase}:{size:number;phase?:string;reduce?:boolean}){
 const breath=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  breath.setValue(0);if(reduce)return;
  const loop=Animated.loop(Animated.sequence([Animated.timing(breath,{toValue:1,duration:4300,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false}),Animated.timing(breath,{toValue:0,duration:4300,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false})]));
  const sync=(state:string)=>{loop.stop();if(state==='active'){loop.reset();loop.start()}};
  sync(AppState.currentState);const listener=AppState.addEventListener('change',sync);
  return()=>{listener.remove();loop.stop()};
 },[reduce,breath]);
 return <View testID="painted-orb" pointerEvents="none" style={{width:size,height:size*1.125}}>
  <View style={{position:'absolute',left:size*.07,bottom:-size*.015,width:size*.86,height:size*.12,borderRadius:size,backgroundColor:'#07040388',boxShadow:'0 5px 14px #080400'}}/>
  <Image source={require('../assets/apothecary/stand.webp')} style={{position:'absolute',left:size*.1,top:size*.73,width:size*.8,height:size*.395}} resizeMode="stretch"/>
  <View style={{position:'absolute',left:size*.055,top:0,width:size*.89,height:size*.89,borderRadius:size,overflow:'hidden',backgroundColor:'#20120B',boxShadow:'0 0 24px #d0923729'}}>
   <Image source={require('../assets/apothecary/interior.webp')} style={{position:'absolute',left:'-11%',top:'-11%',width:'122%',height:'122%'}}/>
   <Animated.Image testID="painted-smoke" source={require('../assets/apothecary/smoke.webp')} style={{position:'absolute',width:'100%',height:'100%',opacity:breath.interpolate({inputRange:[0,1],outputRange:[phase==='reveal'?.3:.13,phase==='reveal'?.5:.26]}),transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-size*.025]})},{scale:breath.interpolate({inputRange:[0,1],outputRange:[1,1.06]})}]}}/>
   <Image source={require('../assets/apothecary/glass.webp')} style={{position:'absolute',width:'100%',height:'100%',opacity:.85}}/>
  </View>
 </View>;
}
