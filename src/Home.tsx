import React from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {AskOrb,type BallSpin} from './RoomScene';
import {Txt,fonts} from './ui';
import {haptic} from './native';
import {Material} from './Material';

// Home is ported from the Claude Design canvas artboard project/Library.dc.html ("Library"); values below are its own.
export const homeFonts={serif:fonts.display,italic:fonts.italic,sans:fonts.body};
const cream='#f4ead8',muted='rgba(242,231,210,.62)',active='#f4e2bc';
export const homeTabBarHeight=74;
// Web lets a drag on the ball spin it instead of scrolling the page.
const noScroll={touchAction:'none'} as object;

// Home's screen content, docked below the room's ball (top) with the canvas's own copy and omen card.
export function Home({ready,libraryLocked,onLibrary,checkIns,omen,top,bottom}:{ready:boolean;libraryLocked:boolean;onLibrary:()=>void;checkIns:React.ReactNode;omen:React.ReactNode;top:number;bottom:number}){
 return <View style={{position:'absolute',left:0,top,right:0,bottom:homeTabBarHeight+1+bottom}}>
  <ScrollView contentContainerStyle={{paddingBottom:16}}>
   <View pointerEvents="none" style={{alignItems:'center',gap:10}}>
    <Txt style={{fontFamily:homeFonts.italic,fontSize:25,lineHeight:27.5,color:cream,textShadowColor:'rgba(0,0,0,.8)',textShadowOffset:{width:0,height:2},textShadowRadius:12}}>What lies ahead?</Txt>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
     <Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:2.64,textTransform:'uppercase',color:'rgba(242,231,210,.66)'}}>Touch the ball</Txt>
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
  <Pressable testID="view-plans" accessibilityRole="button" accessibilityLabel="View plans" disabled={!ready} onPress={onPlans} style={{minHeight:44,marginTop:-7,paddingHorizontal:16,flexDirection:'row',alignItems:'center'}}>
   <Material name="brass-plaque">
   <Txt style={{fontFamily:homeFonts.sans,fontSize:11.5,lineHeight:14,letterSpacing:2.07,textTransform:'uppercase',color:'rgba(242,231,210,.74)'}}>{count}</Txt>
  </Material></Pressable>
 </View>;
}

// The room ball's touch target: a drag spins the live ball, a tap reads (Home) or asks (Ask, once the question is ready).
export function BallButton({x,y,r,home,spin,onPress}:{x:number;y:number;r:number;home:boolean;spin:BallSpin;onPress?:()=>void}){
 const hit=Math.max(r,22);
 return <Pressable testID={home?'hero-orb':'ask-ball'} accessibilityRole="button" accessibilityLabel={home?'Touch the ball to receive your reading':'Touch the ball'} onPointerDown={e=>spin.grab?.(e.nativeEvent as unknown as PointerEvent)} onPressIn={()=>haptic('touch')} onPress={()=>{if(spin.dragged){spin.dragged=false;return}onPress?.()}} style={{...noScroll,position:'absolute',left:x-hit,top:y-hit,width:hit*2,height:hit*2,borderRadius:hit}}/>;
}

// The omen card, on its wax-card material over the scene.
export function OmenCard({busy,children,...props}:React.PropsWithChildren<{busy?:boolean;testID?:string}>){
 return <View {...props} accessibilityState={{busy}} style={{paddingTop:18,paddingHorizontal:22,paddingBottom:20,gap:8}}>
  <Material name="brass-plaque">
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:1.76,textTransform:'uppercase',color:'rgba(246,214,166,.85)'}}>Today’s omen</Txt>
   <View style={{paddingVertical:3,paddingHorizontal:8}}><Material name="oak-chip"><Txt style={{fontFamily:homeFonts.sans,fontSize:11,lineHeight:14,letterSpacing:1.32,textTransform:'uppercase',color:'rgba(246,214,166,.85)'}}>Free</Txt></Material></View>
  </View>
  {children}
 </Material></View>;
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
 return <View accessibilityRole="tablist" style={{position:'absolute',left:0,right:0,bottom:0,height:homeTabBarHeight+1+bottom,paddingBottom:bottom,flexDirection:'row'}}>
  <Material name="leather-strip">
  {(['Home','Sky','Ask','History','You'] as Tab[]).map(t=><Pressable disabled={disabled} testID={`tab-${t.toLowerCase()}`} key={t} accessibilityRole="tab" aria-selected={t===current} accessibilityState={{selected:t===current}} accessibilityLabel={t==='Ask'?'Ask the crystal ball':t} onPress={()=>onTab(t)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',gap:t==='Ask'?6:4,paddingBottom:8}}>
   {t===current?<Material name="leather-strip" state="selected"/>:null}
   {t==='Ask'?<AskOrb reduce={reduce}/>:<SvgXml aria-hidden xml={tabIcons[t].replaceAll('currentColor',t===current?active:muted)} width={22} height={22}/>}
   <Txt allowFontScaling={false} style={[label,{color:t===current?active:muted}]}>{t}</Txt>
  </Pressable>)}
 </Material></View>;
}
