import React,{useContext,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Pressable,StyleSheet,Text,TextInput,View,Platform,Easing,type TextStyle,type TextInputProps,type ViewStyle,type StyleProp} from 'react-native';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle} from './delight';
import {haptic} from './native';
import {useStore} from './store';
import {SvgXml} from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import {LinearGradient} from 'expo-linear-gradient';
import {Surface,SurfaceInk,onGold} from './Surface';
// The design system's palette (docs/design/ui-rules.md): one warm ground, cream ink, a single gold accent.
export const colors={ink:'#140E0A',ivory:'#F4EBDD',gold:'#E3C78F',ice:'#E3C78F',muted:'#DCCFBA',label:'#CDB98F',inactive:'#A8987F',onGold,line:'rgba(227,199,143,.22)'};
// IM Fell English for display and italics; Cormorant Garamond for copy and buttons; Jost for labels, captions and navigation. app/_layout.tsx loads these.
export const fonts={display:'IMFellEnglish',italic:'IMFellEnglishItalic',semibold:'CormorantGaramondSemiBold',body:'CormorantGaramond',sans:'Jost',sansMedium:'JostMedium'};
// Cormorant's small x-height reads a size smaller than a text face at body sizes, so serif body text sets a step larger
// (large text's doubling already covers it).
const bodyScale=1.12;
// Bold weights map to the bundled faces instead of synthesized bold.
const faces:Record<string,string>={CormorantGaramond:fonts.semibold,Jost:fonts.sansMedium};
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){
 const {state}=useStore(),ink=useContext(SurfaceInk);
 const composed:TextStyle=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?36:16,lineHeight:display?40:24},style]);
 const family=composed.fontFamily??fonts.body,bold=Number(composed.fontWeight)>=(family.startsWith('Jost')?500:600)&&faces[family];
 const scale=state.largeText&&props.allowFontScaling!==false?2:display||family.startsWith('Jost')?1:bodyScale;
 return <Text {...props} style={[composed,bold?{fontFamily:bold,fontWeight:'normal'}:null,ink?{color:ink}:null,{fontSize:Math.round((composed.fontSize||16)*scale),lineHeight:Math.round((composed.lineHeight||24)*scale)}]}>{children}</Text>;
}

// Primary actions are a gold pill; quiet ones a glass row.
// `onBlocked` hears a press on the disabled action from a wrapper, so the button itself stays disabled for assistive technology.
// A disabled button swallows click on web, so the wrapper listens for the lift instead (pointer up on web, touch end on native).
export function Action({onBlocked,...props}:ActionProps&{onBlocked?:()=>void}){
 if(!onBlocked)return <ActionButton {...props}/>;
 const blocked=props.disabled?onBlocked:undefined;
 return <View {...(Platform.OS==='web'?{onPointerUp:blocked}:{onTouchEnd:blocked})}><ActionButton {...props}/></View>;
}
type ActionProps={label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string};
function ActionButton({label,onPress,quiet=false,disabled=false,testID}:ActionProps){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[styles.action,quiet&&styles.quiet]}>{({pressed})=><Surface kind={quiet?'row':'primary'} state={disabled?'disabled':pressed?'pressed':undefined}><Txt style={[styles.strong,{lineHeight:24,color:quiet?colors.ivory:colors.onGold,textAlign:'center',opacity:disabled?.6:1}]}>{label}</Txt></Surface>}</Pressable>}
const chevron='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E3C78F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
// A row that goes somewhere: its label on the left, an optional label-style detail and a gold chevron on the right.
// `grouped` rows sit inside a card with its switches (Settings): no glass of their own, body text, 44-point rows.
export function RowLink({label,detail,onPress,disabled=false,testID,accessibilityLabel,grouped=false}:{label:string;detail?:string;onPress:()=>void;disabled?:boolean;testID?:string;accessibilityLabel?:string;grouped?:boolean}){
 const row=<><Txt style={grouped?{flex:1}:[styles.strong,{flex:1}]}>{label}</Txt>{detail?<Txt style={styles.label}>{detail}</Txt>:null}<View><SvgXml aria-hidden xml={chevron} width={18} height={18}/></View></>;
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={grouped?({pressed})=>({minHeight:44,flexDirection:'row',alignItems:'center',gap:10,opacity:disabled||pressed?.6:1}):{minHeight:52,paddingVertical:12,paddingLeft:18,paddingRight:16,flexDirection:'row',alignItems:'center',gap:10}}>{grouped?row:({pressed})=><Surface kind="row" state={disabled?'disabled':pressed?'pressed':undefined}>{row}</Surface>}</Pressable>;
}
// A card's heading row: a display title and, on the right, a small label.
export function CardHeader({title,label}:{title:string;label?:string}){
 return <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><Txt display accessibilityRole="header" style={[styles.heading,{flexShrink:1}]}>{title}</Txt>{label?<Txt style={styles.label}>{label}</Txt>:null}</View>;
}
// A text field on its input surface, which also shows its focus (the global focus ring skips fields). Its outer placement (margins, flex, width) moves to the frame so
// the surface covers exactly the field.
const outer=['margin','marginTop','marginBottom','marginLeft','marginRight','marginVertical','marginHorizontal','flex','flexGrow','flexShrink','flexBasis','width','minWidth','maxWidth','alignSelf'] as const;
export function Field({style,ref,...props}:TextInputProps&{ref?:React.Ref<TextInput>}){const [focused,setFocused]=useState(false),flat=StyleSheet.flatten(style)||{},frame:ViewStyle={},field:Record<string,unknown>={...flat};for(const key of outer)if(key in field){(frame as Record<string,unknown>)[key]=field[key];delete field[key]}return <View style={frame}><Surface kind="input" state={focused?'focused':undefined}><TextInput ref={ref} placeholderTextColor={colors.inactive} {...props} onFocus={e=>{setFocused(true);props.onFocus?.(e)}} onBlur={e=>{setFocused(false);props.onBlur?.(e)}} style={[{position:'relative'},field]}/></Surface></View>}
// A pill switch: a glass track that fills gold when on, with a cream knob.
export function Toggle({value,onValueChange,disabled=false,testID,accessibilityLabel}:{value:boolean;onValueChange:(value:boolean)=>void;disabled?:boolean;testID?:string;accessibilityLabel:string}){
 const {state}=useStore(),knob=useRef(new Animated.Value(value?20:0)).current,[systemReduce,setSystemReduce]=useState(false),reduce=state.reduceMotion||systemReduce;
 useEffect(()=>{
  if(Platform.OS==='web'){const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setSystemReduce(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change)}
  AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduce);const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setSystemReduce);return()=>listener.remove();
 },[]);
 useEffect(()=>{const slide=Animated.timing(knob,{toValue:value?20:0,duration:reduce?0:200,easing:Easing.bezier(...motion.ease),useNativeDriver:Platform.OS!=='web'});slide.start();return()=>slide.stop()},[value,knob,reduce]);
 return <Pressable testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} aria-checked={value} accessibilityState={{checked:value,disabled}} disabled={disabled} onPress={()=>onValueChange(!value)} style={{minWidth:52,minHeight:44,justifyContent:'center',opacity:disabled?.5:1}}>
  <View style={{width:52,height:32}}><Surface kind="chip" state={value?'selected':undefined}/><Animated.View style={{position:'absolute',top:3,left:3,width:26,height:26,borderRadius:13,backgroundColor:value?colors.onGold:colors.ivory,transform:[{translateX:knob}]}}/></View>
 </Pressable>;
}
// A segmented pill: one gold fill slides under the chosen segment; segments wrap (large text) and the fill follows.
export function Segmented<T extends string>({options,value,onChange,reduce=false}:{options:readonly {value:T;label:string;testID?:string}[];value:T;onChange:(value:T)=>void;reduce?:boolean}){
 const [frames,setFrames]=useState<Partial<Record<T,{x:number;y:number;width:number;height:number}>>>({}),frame=frames[value];
 const pill=useRef({x:new Animated.Value(0),y:new Animated.Value(0),width:new Animated.Value(0),height:new Animated.Value(0)}).current,placed=useRef(false);
 useEffect(()=>{
  if(!frame)return;
  if(reduce||!placed.current){placed.current=true;(Object.keys(pill) as (keyof typeof pill)[]).forEach(k=>pill[k].setValue(frame[k]));return}
  const slide=Animated.parallel((Object.keys(pill) as (keyof typeof pill)[]).map(k=>Animated.timing(pill[k],{toValue:frame[k],duration:320,easing:Easing.bezier(...motion.ease),useNativeDriver:false})));slide.start();return()=>slide.stop();
 },[frame?.x,frame?.y,frame?.width,frame?.height,reduce]);
 return <View style={{alignSelf:'center',maxWidth:'100%',flexDirection:'row',flexWrap:'wrap',justifyContent:'center',padding:4,gap:2}}><Surface kind="pill"/>
  {frame?<Animated.View pointerEvents="none" style={{position:'absolute',left:pill.x,top:pill.y,width:pill.width,height:pill.height}}><Surface kind="primary"/></Animated.View>:null}
  {options.map(o=><Pressable key={o.value} testID={o.testID} accessibilityRole="button" accessibilityState={{selected:value===o.value}} aria-pressed={value===o.value} onLayout={e=>{const {x,y,width,height}=e.nativeEvent.layout;setFrames(f=>({...f,[o.value]:{x,y,width,height}}))}} onPress={()=>onChange(o.value)} style={{minHeight:44,paddingHorizontal:22,justifyContent:'center'}}><Txt style={[styles.strong,{color:value===o.value?colors.onGold:'#E9DCC6'}]}>{o.label}</Txt></Pressable>)}
 </View>;
}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();if(state.largeText)size=Math.min(size,96);
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce} ball={selectedStyle(state,'ball')}/></Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
// Scrolling content fades out at its edges instead of meeting a hard line: it is gone above `top`, rises in over `soft` px,
// and (above a tab bar) fades over the last `bottom` px.
export function EdgeFade({top=0,soft=24,bottom=0,style,children}:React.PropsWithChildren<{top?:number;soft?:number;bottom?:number;style?:StyleProp<ViewStyle>}>){
 if(Platform.OS==='web'){const mask=`linear-gradient(180deg,transparent ${top}px,#000 ${top+soft}px,#000 calc(100% - ${bottom}px),${bottom?'transparent':'#000'})`;return <View style={[{flex:1},style,{maskImage:mask,WebkitMaskImage:mask} as ViewStyle]}>{children}</View>}
 return <MaskedView style={[{flex:1},style]} maskElement={<View style={{flex:1}}><View style={{height:top}}/><LinearGradient colors={['transparent','#000']} style={{height:soft}}/><View style={{flex:1,backgroundColor:'#000'}}/>{bottom?<LinearGradient colors={['#000','transparent']} style={{height:bottom}}/>:null}</View>}>{children}</MaskedView>;
}
// `keyboardInsets={false}` is for content that makes its own room for the keyboard (onboarding).
// `under` lets a tab's content scroll all the way up and fade out beneath the header that ends there; otherwise the
// viewport starts just above the content. `ball` is reserved for the revealed reading; see docs/design/ui-rules.md.
// Its box-none padding preserves ball input above the content.
// `ground` darkens the room behind tab content and scrolls with it.
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen",direction,top=14,bottom=36,under,ball=false,keyboardInsets=true,ground}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;direction?:number;top?:number;bottom?:number;under?:number;ball?:boolean;keyboardInsets?:boolean;ground?:number}>){
 const edge=under===undefined&&!ball?Math.max(0,top-24):0,through=ball?styles.through:undefined,scrolled=useRef(new Animated.Value(0)).current,fill=`rgba(20,14,10,${ground})`;
 return <EdgeFade top={under??0} soft={under===undefined&&!ball?24:36} bottom={under===undefined?0:24} style={[{marginTop:edge},through]}>{ball?<Animated.View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,height:top+84,opacity:scrolled.interpolate({inputRange:[0,160],outputRange:[0,1],extrapolate:'clamp'})}}><View style={{flex:1,backgroundColor:'rgba(20,14,10,.88)'}}/><LinearGradient colors={['rgba(20,14,10,.88)','rgba(20,14,10,0)']} style={{height:140}}/></Animated.View>:null}<Animated.ScrollView style={through} onScroll={ball?Animated.event([{nativeEvent:{contentOffset:{y:scrolled}}}],{useNativeDriver:true}):undefined} scrollEventThrottle={16} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={keyboardInsets} keyboardShouldPersistTaps="handled" contentContainerStyle={[{paddingTop:top-edge,flexGrow:1},through]}>
  {ground?<View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:Math.max(0,top-edge-140),bottom:0}}><LinearGradient colors={['rgba(20,14,10,0)',fill]} style={{height:140}}/><View style={{flex:1,backgroundColor:fill}}/></View>:null}
  <Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} direction={direction} fill><View style={{flexGrow:1,paddingHorizontal:24,paddingBottom:bottom}}>{children}</View></Enter></Animated.ScrollView></EdgeFade>;
}

// The one type scale (docs/design/ui-rules.md): screen titles 36 (the header), display `hero` 30 for a screen's single lead line
// and `heading` 24 for card and section titles; serif body 16 and `strong` 17 for rows and buttons; Jost caption 13, meta 12, label 11.
export const styles=StyleSheet.create({action:{minHeight:52,paddingVertical:14,paddingHorizontal:22,justifyContent:'center',marginTop:14},quiet:{minHeight:48,paddingVertical:12},input:{fontFamily:fonts.body,fontSize:18,color:colors.ivory,padding:16,minHeight:52},panel:{padding:20,marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},caption:{fontFamily:fonts.sans,fontSize:13,lineHeight:19,color:colors.muted},label:{fontFamily:fonts.sansMedium,fontSize:11,lineHeight:14,letterSpacing:1.54,textTransform:'uppercase',color:colors.label},meta:{fontFamily:fonts.sansMedium,fontSize:12,lineHeight:16,letterSpacing:.6,color:colors.label},chip:{fontFamily:fonts.sansMedium,fontSize:14,lineHeight:18},muted:{color:colors.muted},overRoom:Platform.OS==='web'?{textShadow:'0 1px 14px rgba(20,14,10,.95), 0 0 4px rgba(20,14,10,.8)'} as TextStyle:{textShadowColor:'rgba(20,14,10,.95)',textShadowOffset:{width:0,height:1},textShadowRadius:12},hero:{fontSize:30,lineHeight:34},heading:{fontSize:24,lineHeight:28},strong:{fontFamily:fonts.semibold,fontSize:17,lineHeight:22},gap:{height:20},through:{pointerEvents:'box-none'}});
