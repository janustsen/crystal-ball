import React,{useRef} from 'react';
import {Animated,Pressable,StyleSheet,Text,TextInput,View,ScrollView,Platform,Easing,type TextStyle,type TextInputProps,type ViewStyle} from 'react-native';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle} from './delight';
import {haptic} from './native';
import {useStore} from './store';
import {Material} from './Material';
export const colors={ink:'#120E0B',violet:'#281B10',lavender:'#9C7B4F',ice:'#F2C284',gold:'#E0A458',ivory:'#F1E9DC',muted:'#B9AB97',surface:'#1C1510',outline:'#0B0604'};
// The one UI typeface, the room header's Cormorant Garamond; app/_layout.tsx loads only these two faces.
export const fonts={display:'CormorantGaramond',italic:'CormorantGaramondItalic',body:'CormorantGaramond'};
// Cormorant's small x-height reads a size smaller than a text face at body sizes, so body text sets a step larger
// (large text's doubling already covers it).
const bodyScale=1.12;
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){const {state}=useStore();const scale=state.largeText&&props.allowFontScaling!==false?2:display?1:bodyScale;const composed:TextStyle=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?38:16,lineHeight:display?42:24},display&&styles.inked,style]);return <Text {...props} style={[composed,{fontSize:Math.round((composed.fontSize||16)*scale),lineHeight:Math.round((composed.lineHeight||24)*scale)}]}>{children}</Text>}

export function Action({label,onPress,quiet=false,disabled=false,testID}: {label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string}){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.action,pressed&&!disabled&&styles.pressed]}>{({pressed})=><><Material name={quiet?'engraved-button':'brass-plaque'} state={disabled?'disabled':pressed?'pressed':undefined}/><Txt style={{fontFamily:fonts.body,fontWeight:'600',color:disabled?colors.muted:quiet?colors.ivory:colors.ink,textAlign:'center'}}>{label}</Txt></>}</Pressable>}
// A text field on its glass-input material. The field's outer placement (margins, flex, width) moves to the frame so
// the material covers exactly the field.
const outer=['margin','marginTop','marginBottom','marginLeft','marginRight','marginVertical','marginHorizontal','flex','flexGrow','flexShrink','flexBasis','width','minWidth','maxWidth','alignSelf'] as const;
export function Field({style,...props}:TextInputProps){const flat=StyleSheet.flatten(style)||{},frame:ViewStyle={},field:Record<string,unknown>={...flat};for(const key of outer)if(key in field){(frame as Record<string,unknown>)[key]=field[key];delete field[key]}return <View style={frame}><Material name="glass-input"/><TextInput {...props} style={[{position:'relative'},field]}/></View>}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();if(state.largeText)size=Math.min(size,96);
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce} ball={selectedStyle(state,'ball')}/></Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen",top=14}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;top?:number}>){return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{marginTop:top}} contentContainerStyle={{padding:24,paddingTop:0,paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({action:{minHeight:54,paddingVertical:14,paddingHorizontal:22,justifyContent:'center',marginTop:14},pressed:{transform:[{translateY:3}]},inked:{textShadowColor:'rgba(0,0,0,.7)',textShadowOffset:{width:0,height:2},textShadowRadius:0},input:{fontFamily:fonts.body,fontSize:16,color:colors.ivory,padding:16,minHeight:56},panel:{padding:20,marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},caption:{fontSize:13,lineHeight:19,color:colors.muted},muted:{color:colors.muted},title:{fontSize:32,lineHeight:36,marginBottom:12},gap:{height:20}});
