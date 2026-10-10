import React,{useContext,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,Text,TextInput,View,ScrollView,Platform,Easing,type TextStyle,type TextInputProps,type ViewStyle} from 'react-native';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle} from './delight';
import {haptic} from './native';
import {useStore} from './store';
import {SvgXml} from 'react-native-svg';
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
function ActionButton({label,onPress,quiet=false,disabled=false,testID}:ActionProps){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[styles.action,quiet&&styles.quiet]}>{({pressed})=><Surface kind={quiet?'row':'primary'} state={disabled?'disabled':pressed?'pressed':undefined}><Txt style={{fontFamily:fonts.semibold,fontSize:quiet?17:18,lineHeight:24,color:quiet?colors.ivory:colors.onGold,textAlign:'center',opacity:disabled?.6:1}}>{label}</Txt></Surface>}</Pressable>}
const chevron='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E3C78F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
// A row that goes somewhere: its label on the left, an optional label-style detail and a gold chevron on the right.
export function RowLink({label,detail,onPress,disabled=false,testID,accessibilityLabel}:{label:string;detail?:string;onPress:()=>void;disabled?:boolean;testID?:string;accessibilityLabel?:string}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={{minHeight:52,paddingVertical:12,paddingLeft:18,paddingRight:16,flexDirection:'row',alignItems:'center',gap:10}}>{({pressed})=><Surface kind="row" state={disabled?'disabled':pressed?'pressed':undefined}>
  <Txt style={{flex:1,fontFamily:fonts.semibold,fontSize:17,lineHeight:22}}>{label}</Txt>{detail?<Txt style={styles.label}>{detail}</Txt>:null}<View><SvgXml aria-hidden xml={chevron} width={18} height={18}/></View>
 </Surface>}</Pressable>;
}
// A card's heading row: a display title and, on the right, a small label.
export function CardHeader({title,label}:{title:string;label?:string}){
 return <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><Txt display accessibilityRole="header" style={{fontSize:24,lineHeight:28,flexShrink:1}}>{title}</Txt>{label?<Txt style={styles.label}>{label}</Txt>:null}</View>;
}
// A text field on its input surface, which also shows its focus (the global focus ring skips fields). Its outer placement (margins, flex, width) moves to the frame so
// the surface covers exactly the field.
const outer=['margin','marginTop','marginBottom','marginLeft','marginRight','marginVertical','marginHorizontal','flex','flexGrow','flexShrink','flexBasis','width','minWidth','maxWidth','alignSelf'] as const;
export function Field({style,...props}:TextInputProps){const [focused,setFocused]=useState(false),flat=StyleSheet.flatten(style)||{},frame:ViewStyle={},field:Record<string,unknown>={...flat};for(const key of outer)if(key in field){(frame as Record<string,unknown>)[key]=field[key];delete field[key]}return <View style={frame}><Surface kind="input" state={focused?'focused':undefined}><TextInput placeholderTextColor={colors.inactive} {...props} onFocus={e=>{setFocused(true);props.onFocus?.(e)}} onBlur={e=>{setFocused(false);props.onBlur?.(e)}} style={[{position:'relative'},field]}/></Surface></View>}
// A pill switch: a glass track that fills gold when on, with a cream knob.
export function Toggle({value,onValueChange,disabled=false,testID,accessibilityLabel}:{value:boolean;onValueChange:(value:boolean)=>void;disabled?:boolean;testID?:string;accessibilityLabel:string}){
 return <Pressable testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} aria-checked={value} accessibilityState={{checked:value,disabled}} disabled={disabled} onPress={()=>onValueChange(!value)} style={{minWidth:52,minHeight:44,justifyContent:'center',opacity:disabled?.5:1}}>
  <View style={{width:52,height:32}}><Surface kind="chip" state={value?'selected':undefined}/><View style={{position:'absolute',top:3,left:value?23:3,width:26,height:26,borderRadius:13,backgroundColor:value?colors.onGold:colors.ivory}}/></View>
 </Pressable>;
}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();if(state.largeText)size=Math.min(size,96);
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce} ball={selectedStyle(state,'ball')}/></Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
// Content scrolling up out of the screen softens into the room instead of meeting a hard edge (web; native keeps the edge).
const fadeTop=Platform.OS==='web'?{maskImage:'linear-gradient(180deg,transparent 0,#000 24px)',WebkitMaskImage:'linear-gradient(180deg,transparent 0,#000 24px)'} as ViewStyle:null;
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen",top=14}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;top?:number}>){return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={[{marginTop:Math.max(0,top-24)},fadeTop]} contentContainerStyle={{padding:24,paddingTop:Math.min(24,top),paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({action:{minHeight:52,paddingVertical:14,paddingHorizontal:22,justifyContent:'center',marginTop:14},quiet:{minHeight:48,paddingVertical:12},input:{fontFamily:fonts.body,fontSize:18,color:colors.ivory,padding:16,minHeight:52},panel:{padding:20,marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},caption:{fontFamily:fonts.sans,fontSize:13,lineHeight:19,color:colors.muted},label:{fontFamily:fonts.sansMedium,fontSize:11,lineHeight:14,letterSpacing:1.54,textTransform:'uppercase',color:colors.label},meta:{fontFamily:fonts.sansMedium,fontSize:12,lineHeight:16,letterSpacing:.6,color:colors.label},chip:{fontFamily:fonts.sansMedium,fontSize:14,lineHeight:18},segment:{fontFamily:fonts.semibold,fontSize:18,lineHeight:22},muted:{color:colors.muted},overRoom:Platform.OS==='web'?{textShadow:'0 1px 14px rgba(20,14,10,.95), 0 0 4px rgba(20,14,10,.8)'} as TextStyle:{textShadowColor:'rgba(20,14,10,.95)',textShadowOffset:{width:0,height:1},textShadowRadius:12},title:{fontSize:26,lineHeight:30,marginBottom:10},feature:{fontSize:38,lineHeight:39,color:colors.gold},gap:{height:20}});
