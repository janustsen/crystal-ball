import React from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {SvgXml} from 'react-native-svg';
import {AskOrb,type BallSpin} from './RoomScene';
import {Txt} from './ui';
import {useStore} from './store';
import {selectedStyle,skinColors} from './delight';
import {haptic} from './native';

// Home is ported from the Claude Design canvas artboard project/Library.dc.html ("Library"); values below are its own.
export const homeFonts={serif:'CormorantGaramond',italic:'CormorantGaramondItalic',sans:'InstrumentSans'};
const cream='#f4ead8',muted='rgba(242,231,210,.62)',active='#f4e2bc';
export const homeTabBarHeight=74;
// react-native-web forwards backdrop-filter; React Native's style types do not list it, and native ignores it.
const frost=(filter:string)=>({backdropFilter:filter}) as object;
// Web lets a drag on the ball spin it instead of scrolling the page.
const noScroll={touchAction:'none'} as object;

// Home's screen content, docked below the room's ball (top) with the canvas's own copy and omen card.
export function Home({ready,libraryLocked,onLibrary,checkIns,omen,top,bottom}:{ready:boolean;libraryLocked:boolean;onLibrary:()=>void;checkIns:React.ReactNode;omen:React.ReactNode;top:number;bottom:number}){
 return <View style={{position:'absolute',left:0,top:0,right:0,bottom:0}}>
  <ScrollView contentContainerStyle={{paddingTop:top,paddingBottom:homeTabBarHeight+bottom+16}}>
   <View pointerEvents="none" style={{alignItems:'center',gap:10}}>
    <Txt style={{fontFamily:homeFonts.italic,fontSize:25,lineHeight:27.5,color:cream,textShadowColor:'rgba(0,0,0,.8)',textShadowOffset:{width:0,height:2},textShadowRadius:12}}>What lies ahead?</Txt>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
     <LinearGradient colors={['rgba(242,231,210,0)','rgba(242,231,210,.5)']} start={{x:0,y:0}} end={{x:1,y:0}} style={{width:28,height:1}}/>
     <Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:2.64,textTransform:'uppercase',color:'rgba(242,231,210,.66)'}}>Touch the ball</Txt>
     <LinearGradient colors={['rgba(242,231,210,.5)','rgba(242,231,210,0)']} start={{x:0,y:0}} end={{x:1,y:0}} style={{width:28,height:1}}/>
    </View>
   </View>
   <View style={{paddingHorizontal:20,marginTop:22.5,gap:14}}>
    {checkIns}
    {omen}
    {/* Placeholder room spot: the designed Inner Library door replaces this link and keeps its testID. */}
    <Pressable testID="room-inner-library" accessibilityRole="button" accessibilityLabel={libraryLocked?'Inner Library, locked. Plus opens it':'Inner Library'} disabled={!ready} onPress={onLibrary} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}>
     <Txt style={{fontFamily:homeFonts.sans,fontSize:11.5,lineHeight:14,letterSpacing:2.07,textTransform:'uppercase',color:'rgba(242,231,210,.74)'}}>{libraryLocked?'Inner Library · Plus':'Inner Library'}</Txt>
    </Pressable>
    <Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:.44,textAlign:'center',color:muted}}>For entertainment. Never a guarantee.</Txt>
   </View>
  </ScrollView>
 </View>;
}

// The canvas header every tab shares: the italic title and the reading balance, which opens Plans.
export function RoomHeader({title,count,ready,onPlans,top}:{title:string;count:string;ready:boolean;onPlans:()=>void;top:number}){
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,right:0,top:top+26,alignItems:'center'}}>
  <Txt accessibilityRole="header" allowFontScaling={false} style={{fontFamily:homeFonts.italic,fontSize:30,lineHeight:30,letterSpacing:.3,color:cream}}>{title}</Txt>
  <Pressable testID="view-plans" accessibilityRole="button" accessibilityLabel="View plans" disabled={!ready} onPress={onPlans} style={{minHeight:44,marginTop:-7,flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{width:5,height:5,borderRadius:3,backgroundColor:'#ffc27a',boxShadow:'0 0 8px rgba(255,180,100,.9)'}}/>
   <Txt style={{fontFamily:homeFonts.sans,fontSize:11.5,lineHeight:14,letterSpacing:2.07,textTransform:'uppercase',color:'rgba(242,231,210,.74)'}}>{count}</Txt>
  </Pressable>
 </View>;
}

// The room ball's touch target: a drag spins the live ball, a tap reads (Home) or asks (Ask, once the question is ready).
export function BallButton({x,y,r,home,spin,onPress}:{x:number;y:number;r:number;home:boolean;spin:BallSpin;onPress?:()=>void}){
 const {state}=useStore(),skin=skinColors[selectedStyle(state,'ball')],hit=Math.max(r,22);
 return <Pressable testID={home?'hero-orb':'ask-ball'} accessibilityRole="button" accessibilityLabel={home?'Touch the ball to receive your reading':'Touch the ball'} onPointerDown={e=>spin.grab?.(e.nativeEvent as unknown as PointerEvent)} onPressIn={()=>haptic('touch')} onPress={()=>{if(spin.dragged){spin.dragged=false;return}onPress?.()}} style={{...noScroll,position:'absolute',left:x-hit,top:y-hit,width:hit*2,height:hit*2,borderRadius:hit,alignItems:'center',justifyContent:'center'}}>
  <View pointerEvents="none" style={{width:r*2,height:r*2,borderRadius:r,backgroundColor:skin.fill,borderWidth:skin.rim==='transparent'?0:1,borderColor:skin.rim}}/>
 </Pressable>;
}

// The canvas omen card: frosted glass over the scene.
export function OmenCard({busy,children,...props}:React.PropsWithChildren<{busy?:boolean;testID?:string}>){
 return <LinearGradient {...props} accessibilityState={{busy}} colors={['rgba(48,32,20,.5)','rgba(18,11,7,.6)']} style={{paddingTop:18,paddingHorizontal:22,paddingBottom:20,borderRadius:20,borderWidth:1,borderColor:'rgba(255,226,186,.14)',boxShadow:'0 24px 48px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,236,206,.14)',...frost('blur(22px) saturate(1.3)'),gap:8}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:1.76,textTransform:'uppercase',color:'rgba(246,214,166,.85)'}}>Today’s omen</Txt>
   <View style={{paddingVertical:3,paddingHorizontal:8,borderRadius:999,borderWidth:1,borderColor:'rgba(246,214,166,.3)'}}><Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:1.32,textTransform:'uppercase',color:'rgba(246,214,166,.85)'}}>Free</Txt></View>
  </View>
  {children}
 </LinearGradient>;
}
export const omenTextStyle={fontFamily:homeFonts.serif,fontSize:21,lineHeight:26.88,color:'#f5ecdc'};

const icon=(d:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const tabIcons:Record<string,string>={
 Home:icon('<path d="M8 21h8M10 21v-9h4v9M12 12v-1.5M12 3.5c1.6 2 1.6 3.6 0 5.2c-1.6-1.6-1.6-3.2 0-5.2z"/>'),
 Sky:icon('<rect x="3.5" y="5" width="10" height="14" rx="1.5" transform="rotate(-10 8.5 12)"/><rect x="10.5" y="4" width="10" height="14" rx="1.5" transform="rotate(8 15.5 11)"/>'),
 History:icon('<path d="M6 3h12M6 21h12M7.5 3c0 5 9 6 9 9s-9 4-9 9M16.5 3c0 5-9 6-9 9s9 4 9 9"/>'),
 You:icon('<circle cx="12" cy="8.5" r="5.5"/><path d="M12 14v7.5M9.5 18.5h5"/>')
};
type Tab='Home'|'Sky'|'Ask'|'History'|'You';
// The canvas tab bar, shared by every tab.
export function HomeTabBar({current,disabled,reduce,bottom,onTab}:{current:string;disabled:boolean;reduce:boolean;bottom:number;onTab:(tab:Tab)=>void}){
 const label={fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:.44};
 return <View accessibilityRole="tablist" style={{position:'absolute',left:0,right:0,bottom:0,height:homeTabBarHeight+1+bottom,paddingBottom:bottom,backgroundColor:'rgba(8,5,3,.72)',...frost('blur(18px)'),borderTopWidth:1,borderColor:'rgba(255,226,186,.1)',flexDirection:'row'}}>
  {(['Home','Sky','Ask','History','You'] as Tab[]).map(t=><Pressable disabled={disabled} testID={`tab-${t.toLowerCase()}`} key={t} accessibilityRole="tab" aria-selected={t===current} accessibilityState={{selected:t===current}} accessibilityLabel={t==='Ask'?'Ask the crystal ball':t} onPress={()=>onTab(t)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',gap:t==='Ask'?6:4,paddingBottom:t===current?0:8}}>
   {t==='Ask'?<AskOrb reduce={reduce}/>:<SvgXml aria-hidden xml={tabIcons[t].replaceAll('currentColor',t===current?active:muted)} width={22} height={22}/>}
   <Txt allowFontScaling={false} style={[label,{color:t===current?active:muted}]}>{t}</Txt>
   {t===current?<View style={{width:4,height:4,borderRadius:2,backgroundColor:'#f4d29c',boxShadow:'0 0 6px rgba(255,190,110,.9)'}}/>:null}
  </Pressable>)}
 </View>;
}
