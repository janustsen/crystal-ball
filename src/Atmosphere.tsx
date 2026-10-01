import {useEffect,useRef} from 'react';
import {Animated,Easing,View} from 'react-native';
function Visitor({index,reduce}:{index:number;reduce:boolean}){
 const value=useRef(new Animated.Value(0)).current;
 const period=useRef((index?67000:43000)+Math.random()*17000).current;
 useEffect(()=>{if(reduce)return;value.setValue(0);const loop=Animated.loop(Animated.timing(value,{toValue:1,duration:period,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));loop.start();return()=>loop.stop()},[reduce,value,period]);
 if(reduce)return null;
 return <Animated.Text style={{position:'absolute',top:index?'18%':'8%',left:0,color:'#E0A458',fontSize:index?22:16,opacity:value.interpolate({inputRange:[0,.72,.78,.88,.94,1],outputRange:[0,0,.18,.18,0,0]}),transform:[{translateX:value.interpolate({inputRange:[0,.72,.94,1],outputRange:[-40,-40,390,390]})},{translateY:value.interpolate({inputRange:[0,1],outputRange:[0,index?-30:90]})}]}}>{index?'☾':'✧'}</Animated.Text>;
}
export function Atmosphere({reduce}:{reduce:boolean;mood:string}){return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0,overflow:'hidden'}}><Visitor index={0} reduce={reduce}/><Visitor index={1} reduce={reduce}/></View>}
