import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Animated,Dimensions,Easing,Keyboard,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import Svg,{Circle,Defs,RadialGradient,Stop,SvgXml} from 'react-native-svg';
import {Shake} from './Enter';
import {motion} from './motion';
import {ballOnScreen,cameraTransform,pushIn,stillFrame,thinkingBall,typingBall,type Camera} from './room';
import {colors,fonts} from './ui';

const native=Platform.OS!=='web';
const spark='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E3C78F"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';

// How much of the screen's bottom the software keyboard covers. iOS reports the keyboard's frame and a browser shrinks
// its visual viewport; Android resizes the window itself, so the shell already ends above the keyboard.
export function useKeyboardInset(){
 const [inset,setInset]=useState(0);
 useEffect(()=>{
  if(Platform.OS==='web'){
   const view=typeof window==='undefined'?null:window.visualViewport;
   if(!view)return;
   const update=()=>setInset(Math.max(0,Math.round(window.innerHeight-view.height-view.offsetTop)));
   update();view.addEventListener('resize',update);view.addEventListener('scroll',update);
   return()=>{view.removeEventListener('resize',update);view.removeEventListener('scroll',update)};
  }
  if(Platform.OS!=='ios')return;
  const subs=[Keyboard.addListener('keyboardWillChangeFrame',e=>setInset(Math.max(0,Dimensions.get('window').height-e.endCoordinates.screenY))),Keyboard.addListener('keyboardWillHide',()=>setInset(0))];
  return()=>subs.forEach(sub=>sub.remove());
 },[]);
 return inset;
}

export function AskBall({width,height,top,bottom,value,onChangeText,refused,reduce,largeText,chip,note,controls,onCamera,testID,placeholder='Type your question',label='Your question'}:{width:number;height:number;top:number;bottom:number;value:string;onChangeText:(text:string)=>void;placeholder?:string;label?:string;refused:number;reduce:boolean;largeText:boolean;chip:ReactNode;note:ReactNode;controls:ReactNode;onCamera:(ball:Camera)=>void;testID?:string}){
 const [chipHeight,setChipHeight]=useState(44),[noteHeight,setNoteHeight]=useState(40),[controlsHeight,setControlsHeight]=useState(120),[textHeight,setTextHeight]=useState(0),[scroll,setScroll]=useState(0),input=useRef<TextInput>(null);
 const viewport=Math.max(1,height-top-bottom-12);
 const contentHeight=Math.max(viewport,chipHeight+12+2*(ballOnScreen(stillFrame('Ask'),width,height)?.r??0)+16+noteHeight+controlsHeight);
 const ball=typingBall(width,height,chipHeight+12,contentHeight-controlsHeight-noteHeight-16,thinkingBall(width,height,top).r/pushIn),offset=Math.min(scroll,contentHeight-viewport);
 useEffect(()=>{onCamera({...ball,y:top+ball.y-offset})},[ball.x,ball.y,ball.r,top,offset]);
 // The text keeps to the square inside the glass and shrinks as the question grows; the field scrolls only past that.
 // Large text never shrinks below its own base size: a long question scrolls inside the glass instead.
 const side=Math.round(ball.r*1.42),base=ball.r*.21*(largeText?1.35:1),size=Math.round(Math.max(largeText?base:13,Math.min(ball.r*.3,base*Math.sqrt(Math.min(1,40/Math.max(1,value.length))))));
 const font={fontFamily:fonts.italic,fontSize:size,lineHeight:Math.round(size*1.18),textAlign:'center' as const},box=Math.min(side,textHeight||side);
 return <ScrollView testID="ask-content" keyboardShouldPersistTaps="handled" scrollEnabled={contentHeight>viewport} onScroll={e=>setScroll(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={{position:'absolute',left:0,top,width,height:viewport}} contentContainerStyle={{height:contentHeight}}>
  <View onLayout={e=>setChipHeight(e.nativeEvent.layout.height)} pointerEvents="box-none" style={{position:'absolute',left:20,right:20,top:0,alignItems:'center'}}>{chip}</View>
  {/* The fog dims behind the words so they read on the glass; tapping anywhere on the ball writes into it. */}
  <Pressable accessible={false} onPress={()=>input.current?.focus()} style={{position:'absolute',left:ball.x-ball.r,top:ball.y-ball.r,width:ball.r*2,height:ball.r*2,borderRadius:ball.r}}>
   <Svg pointerEvents="none" width={ball.r*2} height={ball.r*2}><Defs><RadialGradient id="ask-veil" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={colors.ink} stopOpacity={.66}/><Stop offset=".72" stopColor={colors.ink} stopOpacity={.4}/><Stop offset="1" stopColor={colors.ink} stopOpacity={0}/></RadialGradient></Defs><Circle cx={ball.r} cy={ball.r} r={ball.r} fill="url(#ask-veil)"/></Svg>
  </Pressable>
  <Text aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={e=>setTextHeight(Math.ceil(e.nativeEvent.layout.height))} style={[font,{position:'absolute',left:-9999,width:side,opacity:0}]}>{value||placeholder}</Text>
  <View pointerEvents="box-none" style={{position:'absolute',left:ball.x-side/2,top:ball.y-box/2,width:side}}>
   <Shake trigger={refused} reduce={reduce}><TextInput ref={input} testID={testID} accessibilityLabel={label} autoFocus multiline value={value} onChangeText={onChangeText} maxLength={500} placeholder={placeholder} placeholderTextColor="rgba(244,235,221,.72)" selectionColor={colors.gold} style={[font,{height:box,padding:0,color:colors.ivory,textShadowColor:'rgba(227,199,143,.65)',textShadowRadius:12,textShadowOffset:{width:0,height:0}}]}/></Shake>
  </View>
  <View testID="ask-disclosure" onLayout={e=>setNoteHeight(e.nativeEvent.layout.height)} style={{position:'absolute',left:24,right:24,bottom:controlsHeight}}>{note}</View>
  <View onLayout={e=>setControlsHeight(e.nativeEvent.layout.height)} style={{position:'absolute',left:24,right:24,bottom:0}}>{controls}</View>
 </ScrollView>;
}

// The room behind Ask, filmed by a camera that eases between the resting view, the typing push-in and the thinking
// plunge. Each Ask the Ball (`moment`) plunges with an overshoot, then the room shakes once as it lands.
export function RoomCamera({width,height,cam,reduce,moment,track=false,children}:{width:number;height:number;cam:Camera|null;reduce:boolean;moment:number;track?:boolean;children:ReactNode}){
 const {k,tx,ty}=cameraTransform(width,height,cam);
 const pose=useRef({k:new Animated.Value(k),tx:new Animated.Value(tx),ty:new Animated.Value(ty)}).current,quake=useRef(new Animated.Value(0)).current,plunged=useRef(moment);
 useEffect(()=>{
  const plunge=moment!==plunged.current;plunged.current=moment;
  if(reduce||track){pose.k.setValue(k);pose.tx.setValue(tx);pose.ty.setValue(ty);quake.setValue(0);return}
  const curve=Easing.bezier(...(plunge?[.34,1.3,.64,1]:motion.ease) as [number,number,number,number]);
  const move=Animated.parallel(([[pose.k,k],[pose.tx,tx],[pose.ty,ty]] as const).map(([value,to])=>Animated.timing(value,{toValue:to,duration:plunge?900:480,easing:curve,useNativeDriver:native})));
  const shake=plunge?Animated.timing(quake,{toValue:1,duration:560,delay:520,easing:Easing.linear,useNativeDriver:native}):null;
  if(shake)quake.setValue(0);
  move.start();shake?.start();
  return()=>{move.stop();shake?.stop();quake.setValue(0)};
 },[k,tx,ty,reduce,moment,track]);
 const steps=[0,.12,.26,.4,.55,.7,.85,1];
 return <Animated.View pointerEvents="box-none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',left:0,top:0,width,height,transform:[{translateX:quake.interpolate({inputRange:steps,outputRange:[0,-7,6,-5,4,-2,1,0]})},{translateY:quake.interpolate({inputRange:steps,outputRange:[0,2,-2,1,-1,0,0,0]})},{rotate:quake.interpolate({inputRange:steps,outputRange:['0deg','-1.2deg','1deg','-.8deg','.5deg','-.3deg','.1deg','0deg']})}]}}>
  <Animated.View pointerEvents="box-none" style={{position:'absolute',left:0,top:0,width,height,transform:[{translateX:pose.tx},{translateY:pose.ty},{scale:pose.k}]}}>{children}</Animated.View>
 </Animated.View>;
}

// The magic as the camera lands in the ball: the question sinks into the glass, then a gold flash, one shockwave ring
// and eighteen sparks thrown off it.
const sparks=Array.from({length:18},(_,i)=>({angle:i/18*Math.PI*2+(i%2?.2:-.1),reach:1.25+(i%3)*.3,size:14+(i%4)*5,grow:.8+(i%3)*.3,start:(i%5)*.04}));
export function AskMoment({cam,from,question,moment,reduce}:{cam:Camera|null;from:Camera|null;question:string;moment:number;reduce:boolean}){
 const t=useRef(new Animated.Value(1)).current,sink=useRef(new Animated.Value(1)).current,seen=useRef(moment),[live,setLive]=useState(false);
 useEffect(()=>{
  if(moment===seen.current)return;
  seen.current=moment;
  if(reduce)return;
  t.setValue(0);sink.setValue(0);setLive(true);
  const burst=Animated.parallel([Animated.timing(sink,{toValue:1,duration:760,easing:Easing.bezier(...motion.ease),useNativeDriver:native}),Animated.timing(t,{toValue:1,duration:1300,delay:480,easing:Easing.out(Easing.cubic),useNativeDriver:native})]);
  burst.start(()=>setLive(false));
  return()=>{burst.stop();setLive(false)};
 },[moment,reduce]);
 if(!cam||!live)return null;
 const {x,y,r}=cam,glow=r*1.5,start=from??cam,words=Math.round(start.r*.21);
 return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',left:0,top:0,right:0,bottom:0}}>
  <Animated.Text numberOfLines={3} style={{position:'absolute',left:x-start.r*.71,top:y-words*1.2,width:start.r*1.42,fontFamily:fonts.italic,fontSize:words,lineHeight:Math.round(words*1.18),textAlign:'center',color:colors.ivory,opacity:sink.interpolate({inputRange:[0,.15,1],outputRange:[1,.9,0]}),transform:[{translateY:sink.interpolate({inputRange:[0,1],outputRange:[start.y-y,0]})},{scale:sink.interpolate({inputRange:[0,1],outputRange:[1,.3]})}]}}>{question}</Animated.Text>
  <Animated.View style={{position:'absolute',left:x-glow,top:y-glow,opacity:t.interpolate({inputRange:[0,.12,1],outputRange:[0,.9,0]})}}>
   <Svg width={glow*2} height={glow*2}><Defs><RadialGradient id="ask-flash" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={colors.gold} stopOpacity={.55}/><Stop offset=".55" stopColor={colors.gold} stopOpacity={.16}/><Stop offset="1" stopColor={colors.gold} stopOpacity={0}/></RadialGradient></Defs><Circle cx={glow} cy={glow} r={glow} fill="url(#ask-flash)"/></Svg>
  </Animated.View>
  <Animated.View style={{position:'absolute',left:x-r,top:y-r,width:r*2,height:r*2,borderRadius:r,borderWidth:2,borderColor:colors.gold,opacity:t.interpolate({inputRange:[0,.02,.55,1],outputRange:[0,.85,0,0]}),transform:[{scale:t.interpolate({inputRange:[0,.55,1],outputRange:[.92,2.1,2.1]})}]}}/>
  {sparks.map((s,i)=>{
   const along=t.interpolate({inputRange:[0,s.start,1],outputRange:[0,0,1]});
   return <Animated.View key={i} style={{position:'absolute',left:x-s.size/2,top:y-s.size/2,opacity:along.interpolate({inputRange:[0,.08,.7,1],outputRange:[0,1,.6,0]}),transform:[{translateX:along.interpolate({inputRange:[0,1],outputRange:[Math.cos(s.angle)*r*.7,Math.cos(s.angle)*r*s.reach]})},{translateY:along.interpolate({inputRange:[0,1],outputRange:[Math.sin(s.angle)*r*.7,Math.sin(s.angle)*r*s.reach]})},{scale:along.interpolate({inputRange:[0,1],outputRange:[.2,s.grow]})},{rotate:along.interpolate({inputRange:[0,1],outputRange:['0deg','90deg']})}]}}><SvgXml xml={spark} width={s.size} height={s.size}/></Animated.View>;
  })}
 </View>;
}
