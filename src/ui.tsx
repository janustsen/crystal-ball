import React,{useContext,useEffect,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,Text,TextInput,View,ScrollView,Platform,Easing,type TextStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {SvgXml} from 'react-native-svg';
import {tabArtwork} from './designArt';
import {PaperArt} from './PaperArt';
import {PaperInk,PaperButton} from './Paper';
export {Paper,PaperButton} from './Paper';
import {OrbVisual} from './OrbVisual';
import {Enter} from './Enter';
import {motion,type MotionKind} from './motion';
import {selectedStyle,skinColors} from './delight';
import {haptic} from './native';
import {useStore} from './store';
export const colors={ink:'#120E0B',violet:'#281B10',lavender:'#9C7B4F',ice:'#F2C284',gold:'#F0C17F',ivory:'#F1E9DC',muted:'#DECBB1',surface:'#1C1510',outline:'#0B0604'};
export const fonts={display:'IMFellEnglishSC',wordmark:'IMFellEnglishItalic',body:'Caudex'};
export function Txt({children,display=false,style,...props}:React.ComponentProps<typeof Text>&{display?:boolean}){const paper=useContext(PaperInk);const {state}=useStore();const scale=state.largeText&&props.allowFontScaling!==false?2:1;const composed:TextStyle=StyleSheet.flatten([{color:colors.ivory,fontFamily:display?fonts.display:fonts.body,fontSize:display?28:16,lineHeight:display?34:24},display&&styles.inked,style]);return <Text {...props} style={[composed,{fontSize:(composed.fontSize||16)*scale,lineHeight:(composed.lineHeight||24)*scale,textAlign:'center',...(paper?{color:'#382516',textShadowRadius:0,textShadowColor:'transparent'}:{})}]}>{children}</Text>}

export function RadioGroup({testID,...props}:React.ComponentProps<typeof View>&{testID:string}){
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const group=document.querySelector<HTMLElement>(`[data-testid="${testID}"]`);
  function navigate(event:KeyboardEvent){
   if(![' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)||!(event.target instanceof Element))return;
   const current=event.target.closest<HTMLElement>('[role="radio"]');
   const options=Array.from(group?.querySelectorAll<HTMLElement>('[role="radio"]')??[]).filter(option=>option.getAttribute('aria-disabled')!=='true');
   const index=current?options.indexOf(current):-1;if(index<0)return;
   event.preventDefault();
   if(event.key===' '){if(!event.repeat)current?.click();return;}
   const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+options.length)%options.length;
   options[next].focus();options[next].click();
  }
  group?.addEventListener('keydown',navigate);return()=>group?.removeEventListener('keydown',navigate);
 },[testID]);
 return <View {...props} testID={testID} accessibilityRole="radiogroup"/>;
}

export function Input({style,fill=false,...props}:React.ComponentPropsWithRef<typeof TextInput>&{fill?:boolean;'aria-invalid'?:boolean}){
 const {state}=useStore(),scale=state.largeText&&props.allowFontScaling!==false?2:1;
 const [contentHeight,setContentHeight]=useState(0),[height,setHeight]=useState(0),[offset,setOffset]=useState(0);
 const composed:TextStyle=StyleSheet.flatten([styles.input,style]);
 const input=<TextInput {...props} placeholderTextColor="#2c1e14" onLayout={event=>{setHeight(event.nativeEvent.layout.height);props.onLayout?.(event)}} onContentSizeChange={event=>{setContentHeight(event.nativeEvent.contentSize.height);props.onContentSizeChange?.(event)}} onScroll={event=>{setOffset(Platform.OS==='web'?(event.currentTarget as unknown as HTMLTextAreaElement).scrollTop:event.nativeEvent.contentOffset.y);props.onScroll?.(event)}} style={[composed,{fontSize:(composed.fontSize||16)*scale,lineHeight:(composed.lineHeight||24)*scale,position:'relative',zIndex:1,textAlign:'center',backgroundColor:'#dec9a2',marginVertical:0,borderWidth:props['aria-invalid']?2:0,borderColor:'#813822',borderRadius:0,color:'#24180f'}]}/>;
 const track=Math.max(0,height-32),thumb=Math.max(16,track*height/Math.max(1,contentHeight)),progress=Math.max(0,Math.min(1,offset/Math.max(1,contentHeight-height)));
 return <View style={{position:'relative',flex:fill?1:undefined,minHeight:fill?0:undefined,padding:8,marginVertical:6}}><PaperArt plain/>{input}{props.multiline&&contentHeight>height+2?<>{offset>2?<><LinearGradient pointerEvents="none" colors={['#dec9a2','#dec9a200']} style={{position:'absolute',zIndex:2,left:8,right:8,top:8,height:14}}/><Txt accessible={false} allowFontScaling={false} style={{position:'absolute',zIndex:3,right:-2,top:4,width:18,height:18,borderRadius:9,overflow:'hidden',backgroundColor:'#efe0c0',fontSize:13,lineHeight:18,fontWeight:'700',color:'#5a3714',boxShadow:'0 1px 2px #3a200a55'}}>⌃</Txt></>:null}{progress<.98?<><LinearGradient pointerEvents="none" colors={['#dec9a200','#dec9a2']} style={{position:'absolute',zIndex:2,left:8,right:8,bottom:8,height:14}}/><Txt accessible={false} allowFontScaling={false} style={{position:'absolute',zIndex:3,right:-2,bottom:4,width:18,height:18,borderRadius:9,overflow:'hidden',backgroundColor:'#efe0c0',fontSize:13,lineHeight:18,fontWeight:'700',color:'#5a3714',boxShadow:'0 1px 2px #3a200a55'}}>⌄</Txt></>:null}</>:null}{props.multiline&&height>0&&contentHeight>height+2?<View testID={`${props.testID||'input'}-scroll-cue`} pointerEvents="none" accessible={false} style={{position:'absolute',right:5,top:22,zIndex:3,width:5,height:track,borderRadius:3,backgroundColor:'#69451f40'}}><View style={{width:5,height:Math.min(track,thumb),borderRadius:2,backgroundColor:'#69451f',transform:[{translateY:progress*Math.max(0,track-thumb)}]}}/></View>:null}</View>;
}

export function Action({label,onPress,quiet=false,disabled=false,testID,accessibilityLabel=label}: {label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;testID?:string;accessibilityLabel?:string}){const Component=quiet?Pressable:PaperButton;return <Component {...(!quiet?{wood:true}:{})} testID={testID||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")} accessibilityRole="button" accessibilityLabel={accessibilityLabel} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.action,quiet&&styles.quiet,pressed&&!disabled&&(quiet?styles.quietPressed:styles.pressed),disabled&&styles.disabled]}><Txt style={{fontFamily:quiet?fonts.body:fonts.display,fontSize:quiet?16:19,lineHeight:quiet?22:25,color:quiet?colors.ice:'#ffdda8',textAlign:'center'}}>{label}</Txt></Component>}

export function Orb({size=240,reduce=false,onPress,phase='idle'}:{size?:number;reduce?:boolean;onPress?:()=>void;phase?:'idle'|'research'|'reveal'}){
 const {state}=useStore();
 const ballStyle=selectedStyle(state,'ball'),skin=skinColors[ballStyle];
 const press=useRef(new Animated.Value(1)).current;
 const art=<Animated.View style={{width:size,height:size*1.125,transform:[{scale:press}]}}><OrbVisual size={size} phase={phase} reduce={reduce}/>{ballStyle!=='classic'?<View testID="orb-skin" pointerEvents="none" style={{position:'absolute',left:0,top:0,width:size,height:size,borderRadius:size/2,backgroundColor:skin.fill,borderWidth:1,borderColor:skin.rim}}/>:null}</Animated.View>;
 return onPress?<Pressable testID="hero-orb" accessibilityRole="button" accessibilityLabel="Ask the crystal ball" onPressIn={()=>{haptic('touch');Platform.OS!=='web'&&Animated.timing(press,{toValue:.97,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start();}} onPressOut={()=>Platform.OS!=='web'&&Animated.timing(press,{toValue:1,duration:reduce?0:motion.press,easing:Easing.bezier(...motion.ease),useNativeDriver:true}).start()} onPress={onPress}>{art}</Pressable>:<View accessible={false} importantForAccessibility="no-hide-descendants">{art}</View>;
}
// One focusable, labeled switch target; its small drawing is decorative.
export function Toggle({accessibilityLabel,label=accessibilityLabel,testID,value,disabled=false,onValueChange}:{accessibilityLabel:string;label?:string;testID?:string;value:boolean;disabled?:boolean;onValueChange:(value:boolean)=>void}){
 return <PaperButton wood quiet {...(Platform.OS==='web'?{onKeyDown:(event:React.KeyboardEvent)=>{if(event.key===' '){event.preventDefault();if(!disabled&&!event.repeat)onValueChange(!value)}}}:{})} testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{checked:value,disabled}} aria-checked={value} disabled={disabled} onPress={()=>onValueChange(!value)} style={({pressed})=>[styles.row,{minHeight:52,marginTop:8,paddingVertical:14,paddingHorizontal:16,opacity:disabled?.5:pressed?.7:1}]}><Txt style={{flex:1}}>{label}</Txt><View testID="switch-hardware" aria-hidden accessible={false} style={{width:46,height:28,borderRadius:14,backgroundColor:value?'#b98a4d':'#49301a',padding:3,boxShadow:'inset 0 3px 5px #090400, 0 1px 1px #c59a6266'}}><View testID="switch-knob" style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#402811',backgroundColor:'#d4b379',boxShadow:'inset 0 2px 2px #fff0bd, 0 2px 3px #090400cc',alignSelf:value?'flex-end':'flex-start'}}/></View></PaperButton>;
}
export function Constellation({count,current}:{count:number;current:number}){const points=Array.from({length:count},(_,i)=>({x:14+i*28,y:i%2?18:10}));const line=points.map(p=>`${p.x},${p.y}`).join(' ');return <SvgXml width={count*28} height={30} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count*28} 30"><polyline points="${line}" stroke="#75608C" stroke-width="1" fill="none"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===current?4:3}" fill="${i===current?colors.ice:i<current?colors.gold:'#75608C'}"/>`).join('')}</svg>`}/>}
export function Screen({children,reduce=false,variant=0,zoom=false,kind="screen"}:React.PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind}>){return <ScrollView testID="screen-scroll" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,paddingTop:14,paddingBottom:36,flexGrow:1}}><Enter reduce={reduce} variant={variant} zoom={zoom} kind={kind} fill>{children}</Enter></ScrollView>}

export const styles=StyleSheet.create({
 action:{minHeight:54,paddingVertical:14,paddingHorizontal:22,borderRadius:0,backgroundColor:'transparent',borderWidth:0,justifyContent:'center',marginTop:14,boxShadow:'0 4px 9px rgba(0,0,0,.3)'},
 pressed:{transform:[{translateY:2}],boxShadow:'0 1px 0 #7A5527'},
 quiet:{minHeight:48,marginTop:4,paddingVertical:12,backgroundColor:'transparent',borderWidth:0,borderBottomWidth:0,borderColor:'transparent',borderRadius:0,paddingHorizontal:0,boxShadow:'none'},
 quietPressed:{opacity:.7},
 disabled:{opacity:.55,boxShadow:'none'},
 chip:{backgroundColor:'transparent',borderWidth:0,borderRadius:0},
 inked:{textShadowColor:'rgba(0,0,0,.4)',textShadowOffset:{width:0,height:1},textShadowRadius:2},
 input:{marginVertical:6,fontFamily:fonts.body,fontSize:16,color:'#382516',textAlign:'center',backgroundColor:'#d9bc88',borderWidth:0,borderRadius:3,paddingVertical:16,paddingHorizontal:12,minHeight:56},
 panel:{backgroundColor:'transparent',borderRadius:0,paddingVertical:24,paddingHorizontal:24,borderWidth:0,marginTop:16},
 row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 caption:{fontSize:14,lineHeight:20,color:colors.muted},muted:{color:colors.muted},title:{fontSize:28,lineHeight:34,marginBottom:12},gap:{height:20}
});

// SvgXml camel-cases XML attributes; keep ARIA on the component instead.
export function TabIcon({name,color}:{name:string;color:string}){return <SvgXml width={24} height={30} aria-hidden xml={(tabArtwork[name==='Sky'?'Explore':name]||'<svg/>').replace(' aria-hidden="true"','').replaceAll('currentColor',color)}/>}
