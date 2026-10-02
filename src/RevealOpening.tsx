import {useEffect,useRef} from 'react';
import {Animated,Easing,View} from 'react-native';
import {Orb,Action,colors} from './ui';
import {useOpening,type OpeningProps} from './useOpening';
export function RevealOpening(props:OpeningProps){
 const {phase,finish}=useOpening(props),{golden,reduce,children}=props;
 const value=useRef(new Animated.Value(0)).current;
 useEffect(()=>{value.setValue(0);if(phase==='settled')return;const animation=Animated.timing(value,{toValue:1,duration:reduce?180:phase==='opening'?(golden?1350:1100):700,easing:Easing.linear,useNativeDriver:true});animation.start();return()=>animation.stop()},[phase,reduce,golden,value]);
 const interpolate=(inputRange:number[],outputRange:number[]|string[])=>value.interpolate({inputRange,outputRange});
 if(phase!=='opening')return <Animated.View testID="reveal-content" style={phase==='payoff'?{opacity:reduce?value:1,transform:reduce?[]:[{translateY:interpolate([0,.75,1],[32,-3,0])},{rotate:interpolate([0,.75,1],['4deg','-.3deg','0deg'])},{scale:interpolate([0,.75,1],[.97,1,1])}]}:undefined}>{children}</Animated.View>;
 return <View testID="reveal-opening" style={{minHeight:420,justifyContent:'center',alignItems:'center'}}><Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{width:240,height:270,opacity:interpolate([0,.82,1],[1,1,0]),transform:[{rotate:interpolate([0,.24,.4,.54,.66,.77,.82,1],['0deg','-.6deg','.9deg','-1.3deg','1.8deg','-2.5deg','0deg','0deg'])},{scaleX:interpolate([0,.12,.24,.77,.82,1],[1,1.025,.99,.98,1.035,1.07])},{scaleY:interpolate([0,.12,.24,.77,.82,1],[1,.975,1.01,1.02,.975,1.07])}]}}>
  {[-1,1].map(side=><Animated.View key={side} style={{position:'absolute',left:side<0?0:120,top:0,width:120,height:240,overflow:'hidden',transform:[{translateX:interpolate([0,.82,1],[0,0,side*14])},{rotate:interpolate([0,.82,1],['0deg','0deg',`${side*5}deg`])}]}}><View style={{marginLeft:side<0?0:-120}}><Orb size={240} reduce/></View></Animated.View>)}
  <View style={{position:'absolute',left:0,top:240,width:240,height:30,overflow:'hidden'}}><View style={{marginTop:-240}}><Orb size={240} reduce/></View></View>
  <Animated.View style={{position:'absolute',left:119,top:40,height:150,width:2,backgroundColor:colors.gold,opacity:interpolate([0,.25,.8,1],[0,0,.85,0]),transform:[{scaleY:interpolate([0,.8,1],[.2,1,1.08])}]}}/>
  <Animated.View style={{position:'absolute',left:10,top:30,width:220,height:220,borderRadius:110,borderWidth:2,borderColor:golden?colors.ice:colors.gold,opacity:interpolate([0,.81,.86,1],[0,0,.55,0]),transform:[{scale:interpolate([0,.82,1],[.75,.75,1.45])}]}}/>
  {Array.from({length:golden?12:8},(_,i)=>{const angle=i*Math.PI*2/(golden?12:8);return <Animated.View key={i} style={{position:'absolute',left:120,top:121,width:3,height:6,borderRadius:3,backgroundColor:colors.gold,opacity:interpolate([0,.81,.86,1],[0,0,.7,0]),transform:[{translateX:interpolate([0,.82,1],[0,0,Math.cos(angle)*130])},{translateY:interpolate([0,.82,1],[0,0,Math.sin(angle)*110])}]}}/>})}
 </Animated.View><View style={{width:'100%',maxWidth:260,marginTop:28}}><Action testID="skip-reveal" label="Show forecast" quiet onPress={finish}/></View></View>;
}
