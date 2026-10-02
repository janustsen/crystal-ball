import React,{useRef} from 'react';
import {Animated,Pressable,StyleSheet,Text,TextInput,View,ScrollView,Platform,Easing,type TextStyle} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {tabArtwork} from './designArt';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle,skinColors} from './delight';
import {haptic} from './native';
import {useStore} from './store';
export const colors={ink:'#120E0B',violet:'#281B10',lavender:'#9C7B4F',ice:'#F2C284',gold:'#E0A458',ivory:'#F1E9DC',muted:'#B9AB97',surface:'#1C1510',outline:'#0B0604'};
export const fonts={display:'IMFellEnglish',italic:'IMFellEnglishItalic',body:'HankenGrotesk'};
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){const {state}=useStore();const scale=state.largeText&&props.allowFontScaling!==false?2:1;const composed:TextStyle=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?38:16,lineHeight:display?42:24},display&&styles.inked,style]);return <Text {...props} style={[composed,{fontSize:(composed.fontSize||16)*scale,lineHeight:(composed.lineHeight||24)*scale}]}>{children}</Text>}

export function Input({style,...props}:React.ComponentProps<typeof TextInput>){
 const {state}=useStore(),scale=state.largeText&&props.allowFontScaling!==false?2:1;
 const composed:TextStyle=StyleSheet.flatten([styles.input,style]);
 return <TextInput {...props} style={[composed,{fontSize:(composed.fontSize||16)*scale,lineHeight:(composed.lineHeight||24)*scale}]}/>;
}

export function Action({label,onPress,quiet=false,disabled=false,testID}: {label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string}){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.action,quiet&&styles.quiet,pressed&&!disabled&&(quiet?styles.quietPressed:styles.pressed),disabled&&styles.disabled]}><Txt style={{fontFamily:fonts.body,fontWeight:'600',color:quiet?colors.ivory:colors.ink,textAlign:'center'}}>{label}</Txt></Pressable>}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();
 const ballStyle=selectedStyle(state,'ball'),skin=skinColors[ballStyle];
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce}/>{ballStyle!=='classic'?<View testID="orb-skin" pointerEvents="none" style={{position:'absolute',left:0,top:0,width:size,height:size,borderRadius:size/2,backgroundColor:skin.fill,borderWidth:1,borderColor:skin.rim}}/>:null}</Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
// One focusable, labeled switch target; its small drawing is decorative.
export function Toggle({accessibilityLabel,label=accessibilityLabel,testID,value,disabled=false,onValueChange}:{accessibilityLabel:string;label?:string;testID?:string;value:boolean;disabled?:boolean;onValueChange:(value:boolean)=>void}){
 return <Pressable {...(Platform.OS==='web'?{onKeyDown:(event:React.KeyboardEvent)=>{if(event.key===' '){event.preventDefault();if(!disabled&&!event.repeat)onValueChange(!value)}}}:{})} testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{checked:value,disabled}} aria-checked={value} disabled={disabled} onPress={()=>onValueChange(!value)} style={({pressed})=>[styles.row,{minHeight:52,marginTop:8,paddingVertical:10,opacity:disabled?.5:pressed?.7:1}]}><Txt style={{flex:1}}>{label}</Txt><View aria-hidden accessible={false} style={{width:38,height:22,borderRadius:11,backgroundColor:value?colors.gold:'#665F55',padding:3}}><View style={{width:16,height:16,borderRadius:8,backgroundColor:colors.ivory,alignSelf:value?'flex-end':'flex-start'}}/></View></Pressable>;
}
export function Constellation({count,current}:{count:number;current:number}){const points=Array.from({length:count},(_,i)=>({x:14+i*28,y:i%2?18:10}));const line=points.map(p=>`${p.x},${p.y}`).join(' ');return <SvgXml width={count*28} height={30} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count*28} 30"><polyline points="${line}" stroke="#75608C" stroke-width="1" fill="none"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===current?4:3}" fill="${i===current?colors.ice:i<current?colors.gold:'#75608C'}"/>`).join('')}</svg>`}/>}
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen"}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind}>){return <ScrollView testID="screen-scroll" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,paddingTop:14,paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({
 action:{minHeight:54,paddingVertical:14,paddingHorizontal:22,borderRadius:27,backgroundColor:'#EBD5B0',borderWidth:1,borderColor:'#EBD5B0',justifyContent:'center',marginTop:14,boxShadow:'0 3px 0 #7A5527, 0 8px 18px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)'},
 pressed:{transform:[{translateY:2}],boxShadow:'0 1px 0 #7A5527'},
 quiet:{backgroundColor:'transparent',borderWidth:0,borderBottomWidth:1,borderColor:'#614C3455',borderRadius:0,paddingHorizontal:0,boxShadow:'none'},
 quietPressed:{opacity:.7},
 disabled:{opacity:.55,boxShadow:'none'},
 chip:{backgroundColor:'transparent',borderWidth:0,borderBottomWidth:1,borderColor:'#614C34',borderRadius:0},
 inked:{textShadowColor:'rgba(0,0,0,.4)',textShadowOffset:{width:0,height:1},textShadowRadius:2},
 input:{fontFamily:fonts.body,fontSize:16,color:colors.ivory,backgroundColor:'transparent',borderWidth:0,borderBottomWidth:1,borderColor:'#79634A',borderRadius:0,paddingVertical:16,paddingHorizontal:0,minHeight:56},
 panel:{backgroundColor:'transparent',borderRadius:0,paddingVertical:22,paddingHorizontal:0,borderWidth:0,borderBottomWidth:1,borderColor:'#614C3466',marginTop:16},
 row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 caption:{fontSize:14,lineHeight:20,color:colors.muted},muted:{color:colors.muted},title:{fontSize:28,lineHeight:34,marginBottom:12},gap:{height:20}
});

// SvgXml camel-cases XML attributes; keep ARIA on the component instead.
export function TabIcon({name,color}:{name:string;color:string}){return <SvgXml width={24} height={30} aria-hidden xml={(tabArtwork[name==='Sky'?'Explore':name]||'<svg/>').replace(' aria-hidden="true"','').replaceAll('currentColor',color)}/>}
