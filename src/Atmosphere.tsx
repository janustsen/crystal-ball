import {useEffect,useRef} from 'react';
import {Animated,Image,StyleSheet,View} from 'react-native';
export function Atmosphere({reduce,mood,focused=false,destination='home'}:{reduce:boolean;mood:string;destination?:string;focused?:boolean}){
 const camera=useRef(new Animated.Value(focused?1:0)).current,pan=useRef(new Animated.Value(0)).current;
 useEffect(()=>{const place=destination==='history'?24:destination==='circles'?-24:destination==='plans'?-8:0;const move=Animated.parallel([Animated.timing(camera,{toValue:focused?1:place?.6:0,duration:reduce?0:650,useNativeDriver:true}),Animated.timing(pan,{toValue:place,duration:reduce?0:650,useNativeDriver:true})]);move.start();return()=>move.stop()},[focused,destination,reduce,camera,pan]);
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}>
  <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateX:pan},{scale:camera.interpolate({inputRange:[0,1],outputRange:[1.06,1.3]})}]}]}><Image source={focused?require('../assets/apothecary/room-blurred.webp'):require('../assets/apothecary/room.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></Animated.View>
  <View style={[StyleSheet.absoluteFill,{backgroundColor:mood==='utility'?'#130b07cf':focused?'#140b09a8':'#120904a6'}]}/>
 </View>;
}
