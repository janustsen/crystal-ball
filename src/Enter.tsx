import {entrances,motion,type MotionKind} from './motion';
import {useEffect,useRef,type PropsWithChildren} from 'react';
import {Animated,Easing} from 'react-native';
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number}>){
 const spec=entrances[zoom?"approach":kind];
 const value=useRef(new Animated.Value(reduce?1:0)).current;
 useEffect(()=>{if(reduce){value.setValue(1);return}const animation=Animated.timing(value,{toValue:1,duration:spec.duration,delay,easing:Easing.bezier(...motion.ease),useNativeDriver:true});animation.start();return()=>animation.stop()},[reduce,spec.duration,delay,value]);
 return <Animated.View style={{flexGrow:fill?1:undefined,opacity:value,transform:[{translateY:value.interpolate({inputRange:[0,1],outputRange:[variant%3===1?-spec.y:spec.y,0]})},{scale:value.interpolate({inputRange:[0,1],outputRange:[spec.scale,1]})}]}}>{children}</Animated.View>;
}
