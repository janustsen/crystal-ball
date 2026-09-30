import {useEffect,useRef} from 'react';
import {Animated,Easing,Image,View} from 'react-native';
import {FogTiles} from './FogTiles';
function Wisp({size,index,reduce}:{size:number;index:number;reduce:boolean}){
 const value=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduce){value.setValue(0);return}value.setValue(0);const loop=Animated.loop(Animated.timing(value,{toValue:1,duration:index?13700:9700,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));loop.start();return()=>loop.stop()},[reduce,value,index]);
 return <Animated.Image source={require('../assets/fog-wisp.png')} style={{position:'absolute',left:size*.15,top:0,width:size*.7,height:size*.7,opacity:value.interpolate({inputRange:[0,.2,.6,1],outputRange:[0,.09,.07,0]}),transform:[{translateY:value.interpolate({inputRange:[0,1],outputRange:[size*.25,-size*.55]})},{translateX:value.interpolate({inputRange:[0,1],outputRange:[-size*.1,size*.1]})},{scale:value.interpolate({inputRange:[0,1],outputRange:[.5,1.2]})}]}}/>;
}
export function OrbVisual({size,reduce=false}:{size:number;phase?:string;reduce?:boolean}){
 const glow=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduce){glow.setValue(.5);return}glow.setValue(0);const loop=Animated.loop(Animated.sequence([Animated.timing(glow,{toValue:1,duration:3650,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false}),Animated.timing(glow,{toValue:0,duration:3650,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false})]));loop.start();return()=>loop.stop()},[reduce,glow]);
 return <View style={{width:size,height:size*1.125}}><Animated.View style={{position:'absolute',left:-size*.07,top:-size*.07,width:size*1.14,height:size*1.14,borderRadius:size,backgroundColor:'#E0A458',opacity:glow.interpolate({inputRange:[0,1],outputRange:[.025,.065]}),shadowColor:'#F2C284',shadowRadius:20,shadowOpacity:1,shadowOffset:{width:0,height:0},transform:[{scale:glow.interpolate({inputRange:[0,1],outputRange:[.96,1.06]})}]}}/><Wisp size={size} index={0} reduce={reduce}/><Wisp size={size} index={1} reduce={reduce}/><View style={{position:'absolute',width:size,height:size,borderRadius:size/2,backgroundColor:'#21180F'}}><FogTiles size={size} reduce={reduce}/></View><Image source={require('../assets/orb-glass.png')} style={{width:size,height:size*1.125}}/></View>;
}
