import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,View} from 'react-native';
import {Txt,colors} from './ui';

export function FogWhispers({questions,reduce}:{questions:readonly string[];reduce:boolean}){
 const [index,setIndex]=useState(0),opacity=useRef(new Animated.Value(.65)).current;
 useEffect(()=>{
  if(reduce){opacity.setValue(.65);return;}
  let stopped=false;
  function whisper(){
   opacity.setValue(0);
   Animated.sequence([
    Animated.timing(opacity,{toValue:.7,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
    Animated.delay(2600),
    Animated.timing(opacity,{toValue:0,duration:1800,useNativeDriver:Platform.OS!=='web'}),
   ]).start(({finished})=>{if(finished&&!stopped){setIndex(i=>(i+1)%questions.length);whisper();}});
  }
  whisper();return()=>{stopped=true;opacity.stopAnimation();};
 },[reduce,questions.length,opacity]);
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',left:12,right:12,top:'32%',alignItems:'center'}}><Animated.View style={{opacity,maxWidth:210}}><Txt display style={{fontSize:21,lineHeight:26,textAlign:'center',color:colors.ivory,textShadowColor:colors.ink,textShadowRadius:8}}>{questions[index]}</Txt></Animated.View></View>;
}
