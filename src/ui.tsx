import React,{useRef} from 'react';
import {Animated,Pressable,StyleSheet,Text,View,ScrollView,Platform,Easing} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {tabArtwork} from './designArt';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle,skinColors} from './delight';
import {haptic} from './native';
import {useStore} from './store';
export const colors={ink:'#120E0B',violet:'#281B10',lavender:'#9C7B4F',ice:'#F2C284',gold:'#E0A458',ivory:'#F1E9DC',muted:'#B9AB97',surface:'#1C1510'};
export const fonts={display:'IMFellEnglish',italic:'IMFellEnglishItalic',body:'HankenGrotesk'};
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){const {state}=useStore();const scale=state.largeText&&props.allowFontScaling!==false?2:1;const composed=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?38:16,lineHeight:display?42:24},style]);return <Text {...props} style={[composed,{fontSize:(composed.fontSize||16)*scale,lineHeight:(composed.lineHeight||24)*scale}]}>{children}</Text>}

export function Action({label,onPress,quiet=false,disabled=false,testID}: {label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string}){return <Pressable testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.action,quiet&&styles.quiet,{opacity:pressed?.75:1},disabled&&{backgroundColor:'#30251C',borderWidth:1,borderColor:'#79634A'}]}><Txt style={{fontFamily:fonts.body,fontWeight:'600',color:disabled?colors.muted:quiet?colors.ivory:colors.ink,textAlign:'center'}}>{label}</Txt></Pressable>}
export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();if(state.largeText)size=Math.min(size,96);
 const ballStyle=selectedStyle(state,'ball'),skin=skinColors[ballStyle];
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce}/>{ballStyle!=='classic'?<View testID="orb-skin" pointerEvents="none" style={{position:'absolute',left:0,top:0,width:size,height:size,borderRadius:size/2,backgroundColor:skin.fill,borderWidth:1,borderColor:skin.rim}}/>:null}</Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
export function Constellation({count,current}:{count:number;current:number}){const points=Array.from({length:count},(_,i)=>({x:14+i*28,y:i%2?18:10}));const line=points.map(p=>`${p.x},${p.y}`).join(' ');return <SvgXml width={count*28} height={30} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count*28} 30"><polyline points="${line}" stroke="#75608C" stroke-width="1" fill="none"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===current?4:3}" fill="${i===current?colors.ice:i<current?colors.gold:'#75608C'}"/>`).join('')}</svg>`}/>}
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen"}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind}>){return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,paddingTop:14,paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({action:{minHeight:52,paddingVertical:14,paddingHorizontal:20,borderRadius:12,backgroundColor:colors.ivory,justifyContent:'center',marginTop:12},quiet:{backgroundColor:'transparent',borderWidth:1,borderColor:'#79634A'},input:{fontFamily:fonts.body,fontSize:16,color:colors.ivory,backgroundColor:colors.surface,borderWidth:1,borderColor:'#79634A',borderRadius:16,padding:16,minHeight:56},panel:{backgroundColor:colors.surface,borderRadius:12,padding:20,borderWidth:1,borderColor:'#614C34',marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},caption:{fontSize:13,lineHeight:19,color:colors.muted},muted:{color:colors.muted},title:{fontSize:32,lineHeight:36,marginBottom:12},gap:{height:20}});

export function TabIcon({name,color}:{name:string;color:string}){return <SvgXml width={24} height={30} xml={(tabArtwork[name==='Sky'?'Explore':name]||'<svg/>').replaceAll('currentColor',color)}/>}
