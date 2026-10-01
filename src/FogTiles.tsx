import {useEffect,useRef} from 'react';
import {Animated,Easing,Image,View} from 'react-native';
const textures=[require('../assets/fog-0.png'),require('../assets/fog-1.png'),require('../assets/fog-2.png')];
// Four copies of a seamless tile make the native-driver wrap pixel-identical.
function Layer({size,index,reduce}:{size:number;index:number;reduce:boolean}){
 const drift=useRef(new Animated.Value(0)).current,side=size*(1.15+index*.18);
 useEffect(()=>{if(reduce){drift.setValue(.3);return}drift.setValue(0);const loop=Animated.loop(Animated.timing(drift,{toValue:1,duration:[37000,53000,71000][index],easing:Easing.linear,useNativeDriver:true,isInteraction:false}));loop.start();return()=>loop.stop()},[reduce,drift,index]);
 return <Animated.View style={{position:'absolute',width:side*2,height:side*2,opacity:[.52,.34,.24][index],transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:index===1?[-side,0]:[0,-side]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[0,-side]})}]}}>{[0,1,2,3].map(i=><Image key={i} source={textures[index]} style={{position:'absolute',left:i%2*side,top:Math.floor(i/2)*side,width:side,height:side}}/>)}</Animated.View>;
}
export function FogTiles({size,reduce}:{size:number;reduce:boolean}){return <View pointerEvents="none" style={{width:size,height:size,borderRadius:size/2,overflow:'hidden'}}>{[0,1,2].map(index=><Layer key={index} index={index} size={size} reduce={reduce}/>)}</View>}
