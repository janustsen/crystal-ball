import {useEffect,useRef} from 'react';
import {Animated,Easing,Platform} from 'react-native';
import {colors} from './ui';
export function GoldenGlow({reduce}:{reduce:boolean}){
 const glow=useRef(new Animated.Value(1)).current;
 useEffect(()=>{
  if(reduce){glow.setValue(1);return;}
  glow.setValue(0);
  const animation=Animated.timing(glow,{toValue:1,duration:1000,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'});
  animation.start();return()=>animation.stop();
 },[reduce,glow]);
 return <Animated.View testID="golden-glow" pointerEvents="none" style={{position:'absolute',width:190,height:190,top:8,borderRadius:95,borderWidth:2,borderColor:colors.gold,backgroundColor:'#E0A45822',opacity:glow,transform:[{scale:glow.interpolate({inputRange:[0,1],outputRange:[.8,1.12]})}]}}/>;
}
