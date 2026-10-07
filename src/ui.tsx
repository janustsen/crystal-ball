import React,{useContext,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,Text,TextInput,View,ScrollView,Platform,Easing,type TextStyle,type TextInputProps,type ViewStyle} from 'react-native';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle} from './delight';
import {haptic} from './native';
import {useStore} from './store';
import {Material} from './Material';
import {MaterialInk,gilt,type Ink} from './materials';
export const colors={ink:'#120E0B',violet:'#281B10',lavender:'#9C7B4F',ice:'#F2C284',gold:'#E0A458',ivory:'#F1E9DC',muted:'#B9AB97',surface:'#1C1510',outline:'#0B0604'};
// The one UI typeface, the room header's Cormorant Garamond; app/_layout.tsx loads only these two faces.
export const fonts={display:'CormorantGaramond',italic:'CormorantGaramondItalic',body:'CormorantGaramond'};
// Cormorant's small x-height reads a size smaller than a text face at body sizes, so body text sets a step larger
// (large text's doubling already covers it).
const bodyScale=1.12;
// Text over the room sits in a soft dark halo instead of a hard offset shadow; the web layers it so bright shelves,
// fire and brass behind a label still leave it at 4.5:1 (scripts/check-layout.mjs measures it). Native has one shadow.
const halo=Platform.OS==='web'?{textShadow:'0 0 1px rgba(3,2,1,.95), 0 0 4px rgba(3,2,1,.95), 0 0 10px rgba(3,2,1,.9), 0 0 20px rgba(3,2,1,.9), 0 1px 34px rgba(3,2,1,.85)'} as TextStyle:null;
// Over the room, secondary and gold text take a lighter step of the same hue so they hold 4.5:1 inside that halo.
const roomColors:Record<string,string>={'#B9AB97':'#E6DDCF','#E0A458':'#F6D3A0','#F2C284':'#F6D3A0'};
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){const {state}=useStore(),ink=useContext(MaterialInk);const scale=state.largeText&&props.allowFontScaling!==false?2:display?1:bodyScale;const composed:TextStyle=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?38:16,lineHeight:display?42:24},!ink&&styles.inked,!ink&&halo,style]);if(!ink&&typeof composed.color==='string'&&roomColors[composed.color])composed.color=roomColors[composed.color];return <Text {...props} style={[composed,inked(ink,composed.color),{fontSize:Math.round((composed.fontSize||16)*scale),lineHeight:Math.round((composed.lineHeight||24)*scale)}]}>{children}</Text>}
// On a material with its own text_color every label takes that ink (secondary text slightly lighter), without the
// soft shadow meant for text over the room. Its finish: gilt inlay with a hairline recess above, raised letters whose
// shadow falls away from the spot's light, or flat ink.
function inked(ink:Ink|undefined,color:unknown):TextStyle|null{
 if(!ink)return null;
 // Gilt keeps a label's lighter weight (secondary, translucent); dark ink and raised brass letters stay solid.
 const alpha=typeof color==='string'&&/^rgba/.test(color)?Number(color.split(',')[3]?.replace(')','')):1,opacity=ink.finish!=='gilt'?1:color===colors.muted?.78:alpha;
 const shadow:TextStyle=ink.finish==='gilt'?{textShadowColor:'rgba(0,0,0,.7)',textShadowOffset:{width:0,height:-1},textShadowRadius:0}
  :ink.finish==='relief'?{textShadowColor:'rgba(20,10,4,.85)',textShadowOffset:{width:-Math.round(ink.dir[0]),height:Math.max(1,-Math.round(ink.dir[1]))},textShadowRadius:.5}
  :{textShadowColor:'transparent'};
 return {color:ink.finish==='gilt'?gilt:ink.color,opacity,...shadow};
}

export function Action({label,onPress,quiet=false,disabled=false,testID}: {label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string}){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[styles.action,quiet&&disabled&&{opacity:.5}]}>{({pressed})=><><Material name={quiet?'walnut-button':'brass-button'} state={disabled?'disabled':pressed?'pressed':undefined}><Txt style={{fontFamily:fonts.body,fontWeight:'600',color:disabled?colors.muted:quiet?colors.ivory:colors.ink,textAlign:'center',transform:[{translateY:pressed&&!disabled?2:0}]}}>{label}</Txt></Material></>}</Pressable>}
// A text field on its input material, which also shows its focus (the global focus ring skips fields). Its outer placement (margins, flex, width) moves to the frame so
// the material covers exactly the field.
const outer=['margin','marginTop','marginBottom','marginLeft','marginRight','marginVertical','marginHorizontal','flex','flexGrow','flexShrink','flexBasis','width','minWidth','maxWidth','alignSelf'] as const;
export function Field({style,...props}:TextInputProps){const [focused,setFocused]=useState(false),flat=StyleSheet.flatten(style)||{},frame:ViewStyle={},field:Record<string,unknown>={...flat};for(const key of outer)if(key in field){(frame as Record<string,unknown>)[key]=field[key];delete field[key]}return <View style={frame}><Material name="input" state={focused?'focused':undefined}><FieldInput {...props} onFocus={e=>{setFocused(true);props.onFocus?.(e)}} onBlur={e=>{setFocused(false);props.onBlur?.(e)}} style={[{position:'relative'},field]}/></Material></View>}
function FieldInput(props:TextInputProps){const ink=useContext(MaterialInk)?.color;return <TextInput {...props} style={[props.style,ink?{color:ink}:null]} placeholderTextColor={ink?`${ink}A6`:props.placeholderTextColor}/>}
// A switch skinned from the kit: a walnut chip track (antique brass when on) with the brass medallion as its knob.
export function Toggle({value,onValueChange,disabled=false,testID,accessibilityLabel}:{value:boolean;onValueChange:(value:boolean)=>void;disabled?:boolean;testID?:string;accessibilityLabel:string}){
 return <Pressable testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} aria-checked={value} accessibilityState={{checked:value,disabled}} disabled={disabled} onPress={()=>onValueChange(!value)} style={{minWidth:64,minHeight:44,justifyContent:'center',opacity:disabled?.5:1}}>
  <View style={{width:64,height:34}}><Material name="walnut-chip" state={value?'selected':undefined}/><View style={{position:'absolute',top:3,left:value?33:3,width:28,height:28}}><Material name="medallion"/></View></View>
 </Pressable>;
}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();if(state.largeText)size=Math.min(size,96);
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce} ball={selectedStyle(state,'ball')}/></Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen",top=14}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;top?:number}>){return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{marginTop:top}} contentContainerStyle={{padding:24,paddingTop:0,paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({action:{minHeight:54,paddingVertical:14,paddingHorizontal:22,justifyContent:'center',marginTop:14},inked:{textShadowColor:'rgba(3,2,1,.95)',textShadowOffset:{width:0,height:1},textShadowRadius:8},input:{fontFamily:fonts.body,fontSize:16,color:colors.ivory,padding:16,minHeight:56},panel:{padding:20,marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},caption:{fontSize:13,lineHeight:19,color:colors.muted},muted:{color:colors.muted},title:{fontSize:32,lineHeight:36,marginBottom:12},gap:{height:20}});
