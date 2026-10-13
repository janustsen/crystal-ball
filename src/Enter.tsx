import {entrances,motion,shake,type MotionKind} from './motion';
import {useEffect,useRef,type PropsWithChildren} from 'react';
import {Animated,Easing} from 'react-native';
const springy:MotionKind[]=['question','reveal','share','typing','count','toast','check'];
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0,direction=-1}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number;direction?:number}>){
 const key=zoom?"approach":kind,spec=entrances[key],rotate='rotate' in spec?spec.rotate:0,x='x' in spec?spec.x*direction:0;
 const value=useRef(new Animated.Value(reduce?1:0)).current;
 useEffect(()=>{if(reduce){value.setValue(1);return}const animation=Animated.timing(value,{toValue:1,duration:spec.duration,delay,easing:Easing.bezier(...(springy.includes(key)?motion.spring:motion.ease) as [number,number,number,number]),useNativeDriver:true});animation.start();return()=>animation.stop()},[reduce,spec.duration,delay,value,key]);
 return <Animated.View style={{flexGrow:fill?1:undefined,opacity:value.interpolate({inputRange:x?[0,1]:[0,.4,1],outputRange:x?[0,1]:[0,1,1]}),transform:[{perspective:1000},{translateX:value.interpolate({inputRange:[0,1],outputRange:[x,0]})},{translateY:value.interpolate({inputRange:[0,1],outputRange:[variant%3===1?-spec.y:spec.y,0]})},{rotateY:value.interpolate({inputRange:[0,1],outputRange:[key==='question'?`${variant%2?62:-62}deg`:'0deg','0deg']})},{rotate:value.interpolate({inputRange:[0,1],outputRange:[`${rotate}deg`,'0deg']})},{scale:value.interpolate({inputRange:[0,1],outputRange:[spec.scale,1]})}]}}>{children}</Animated.View>;
}
// Shakes its children once each time `trigger` changes after mount; children stay mounted, so a field keeps focus.
export function Shake({trigger,reduce=false,children}:PropsWithChildren<{trigger:number;reduce?:boolean}>){
 const value=useRef(new Animated.Value(0)).current,consumed=useRef(trigger);
 useEffect(()=>{const changed=trigger!==consumed.current;consumed.current=trigger;if(reduce){value.setValue(0);return}if(!changed)return;value.setValue(0);const animation=Animated.timing(value,{toValue:1,duration:shake.duration,easing:Easing.linear,useNativeDriver:true});animation.start();return()=>animation.stop()},[trigger,reduce,value]);
 return <Animated.View style={{transform:[{translateX:value.interpolate({inputRange:shake.x.map((_,i)=>i/(shake.x.length-1)),outputRange:[...shake.x]})}]}}>{children}</Animated.View>;
}
