import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,Pressable,ScrollView,View,type GestureResponderEvent} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {type BallSpin} from './RoomScene';
import {Txt,RowLink,EdgeFade,colors,fonts,styles} from './ui';
import {haptic} from './native';
import {Surface} from './Surface';
import {Enter} from './Enter';
import {AskOrb} from './AskOrb';
import {localDay} from './retention';
import {moonSvg,skyLine,skyOn} from './real-sky';

// The floating glass tab bar: 68 pt tall, inset 14 pt from the sides and 18 pt from the bottom safe area.
export const homeTabBarHeight=68;
export const barInset=18;
// Space the tab bar takes from the bottom of the screen, so content ends above it.
export const tabBarSpace=(bottom:number)=>bottom+barInset+homeTabBarHeight+8;
// Web lets a drag on the ball spin it instead of scrolling the page.
const noScroll={touchAction:'none'} as object;

// Home's screen content, docked below the room's ball (top): what to do, Sunday's recap, today's omen and the Inner Library.
export function Home({ready,libraryLocked,onLibrary,onBond,checkIns,recap,omen,today,omenFocus=0,top,under,bottom,reduce,direction}:{ready:boolean;libraryLocked:boolean;onLibrary:()=>void;onBond:()=>void;checkIns:React.ReactNode;recap?:React.ReactNode;omen:(cardRef:React.RefObject<View|null>)=>React.ReactNode;today?:React.ReactNode;omenFocus?:number;top:number;under:number;bottom:number;reduce:boolean;direction?:number}){
 // Each omenFocus change (Today's omen step) brings the omen, whether waiting, failed or ready, into view.
 const scroll=useRef<ScrollView>(null),omenRef=useRef<View>(null),content=useRef<View>(null),edge=Math.min(under,Math.max(0,top-24)),pad=top-edge,sky=skyOn(localDay(),Intl.DateTimeFormat().resolvedOptions().timeZone);
 useEffect(()=>{if(omenFocus&&content.current)omenRef.current?.measureLayout(content.current,(_x,y)=>scroll.current?.scrollTo({y:Math.max(0,y+pad-48),animated:!reduce}))},[omenFocus]);
 // Content starts below the ball but scrolls all the way up, fading out beneath the header (under); touches above the
 // content pass through (box-none) so the ball stays the tap and spin target.
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,top:edge,right:0,bottom}}><EdgeFade soft={36} bottom={24} style={styles.through}>
  <ScrollView ref={scroll} style={styles.through} showsVerticalScrollIndicator={false} contentContainerStyle={[{paddingTop:pad},styles.through]}><Enter reduce={reduce} direction={direction}><View ref={content} collapsable={false} style={{gap:14,paddingHorizontal:20,paddingBottom:24}}>
   <View pointerEvents="none" style={{alignItems:'center',gap:6}}>
    <Txt display style={styles.hero}>What lies ahead?</Txt>
    <Txt style={styles.label}>Touch the ball to ask</Txt>
    <View testID="tonight-sky" style={{flexDirection:'row',alignItems:'center',gap:6}}><SvgXml aria-hidden xml={moonSvg(sky.angle,colors.gold)} width={14} height={14}/><Txt style={styles.caption}>Tonight: {skyLine(sky)}</Txt></View>
   </View>
   {checkIns}
   {today}
   {recap}
   {omen(omenRef)}
   <RowLink testID="open-bond" label="Bond reading" detail="You and one person" disabled={!ready} onPress={onBond}/>
   <RowLink testID="room-inner-library" label="Inner Library" detail={libraryLocked?'Plus':undefined} accessibilityLabel={libraryLocked?'Inner Library, locked. Plus opens it':'Inner Library'} disabled={!ready} onPress={onLibrary}/>
  </View></Enter></ScrollView>
 </EdgeFade></View>;
}

const sparkle='<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path fill="#E3C78F" d="M12 1 14.2 9.8 23 12 14.2 14.2 12 23 9.8 14.2 1 12 9.8 9.8z"/></svg>';
// The readings-left pill (or Plus), which opens Plans.
export function PlansPill({count,ready,reduce=false,onPress}:{count:string;ready:boolean;reduce?:boolean;onPress:()=>void}){
 // The count pops only when a shown balance changes (not when it first loads).
 const [shown,setShown]=useState({count,ready,pop:false});
 if(shown.count!==count||shown.ready!==ready)setShown({count,ready,pop:shown.count!==count&&shown.ready&&ready});
 return <Pressable testID="view-plans" accessibilityRole="button" accessibilityLabel="View plans" disabled={!ready} onPress={onPress} style={{minHeight:44,justifyContent:'center'}}>
  <View style={{height:32,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8}}>
   <Surface kind="pill" state={ready?undefined:'disabled'}>
    <View><SvgXml aria-hidden xml={sparkle} width={12} height={12}/></View>
    <Enter key={count} kind="count" reduce={reduce||!shown.pop}><Txt allowFontScaling={false} style={{fontFamily:fonts.sansMedium,fontSize:12,lineHeight:16,letterSpacing:.96}}>{count}</Txt></Enter>
   </Surface>
  </View>
 </Pressable>;
}
// The header every tab shares: the italic title (none at Home), the readings-left pill and the Settings button.
// Where the shared tab header ends, below the safe area.
export const headerBottom=(top:number)=>Math.max(52,top+6)+44;
const gear='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
export function RoomHeader({title,count,ready,reduce,onPlans,onSettings,settings,top}:{title:string;count:string;ready:boolean;reduce?:boolean;onPlans:()=>void;onSettings:()=>void;settings:boolean;top:number}){
 return <View pointerEvents="box-none" style={{position:'absolute',left:24,right:24,top:headerBottom(top)-44,flexDirection:'row',alignItems:'center',gap:12}}>
  {title?<View style={{flexShrink:1}}><Enter key={title} kind="status" reduce={reduce}><Txt accessibilityRole="header" allowFontScaling={false} numberOfLines={1} style={{fontFamily:fonts.italic,fontSize:36,lineHeight:44}}>{title}</Txt></Enter></View>:null}
  <View style={{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:6}}>
   <PlansPill count={count} ready={ready} reduce={reduce} onPress={onPlans}/>
   <Pressable testID="open-settings" accessibilityRole="button" accessibilityLabel="Settings" accessibilityState={{selected:settings}} disabled={!ready} onPress={onSettings} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
    <View style={{width:32,height:32,alignItems:'center',justifyContent:'center'}}><Surface kind="pill" state={ready?undefined:'disabled'}/><View><SvgXml aria-hidden xml={gear.replace('currentColor',settings?colors.gold:colors.ivory)} width={18} height={18}/></View></View>
   </Pressable>
  </View>
 </View>;
}

// Home's short-screen room offset. The room, the ball's touch target and Home's content (laid out unshifted) each sit in
// one, starting identical eases in the same render, so the drawn ball never leaves its target, content never crosses it
// mid-move, and tab changes or notices never snap the room.
export function Shift({offset,reduce,children}:React.PropsWithChildren<{offset?:number;reduce:boolean}>){
 const y=useRef(new Animated.Value(offset??0)).current,placed=useRef(offset!==undefined);
 useEffect(()=>{
  // Before the first layout there is no offset to ease from, so the first measured one is placed directly.
  if(offset===undefined)return;
  if(reduce||!placed.current){placed.current=true;y.stopAnimation();y.setValue(offset);return}
  const move=Animated.timing(y,{toValue:offset,duration:450,easing:Easing.inOut(Easing.ease),useNativeDriver:Platform.OS!=='web'});
  move.start();
  return()=>move.stop();
 },[offset,reduce]);
 return <Animated.View pointerEvents="box-none" style={{position:'absolute',left:0,top:0,right:0,bottom:0,transform:[{translateY:y}]}}>{children}</Animated.View>;
}

// The room ball's touch target: a drag spins the live ball, a tap reads (Home) or asks (Ask, once the question is ready).
export function BallButton({x,y,r,home,spin,onPress}:{x:number;y:number;r:number;home:boolean;spin:BallSpin;onPress?:()=>void}){
 const hit=Math.max(r,22);
 // Web hands over the pointer-down (the scene follows the page's pointer); native forwards each touch.
 const touch=(to:'grab'|'drag'|'release')=>(e:GestureResponderEvent)=>e.nativeEvent.changedTouches.forEach(t=>spin[to]?.({pointerId:Number(t.identifier),clientX:t.pageX,clientY:t.pageY}));
 const grip=Platform.OS==='web'?{onPointerDown:(e:{nativeEvent:unknown})=>spin.grab?.(e.nativeEvent as PointerEvent)}:{onTouchStart:touch('grab'),onTouchMove:touch('drag'),onTouchEnd:touch('release'),onTouchCancel:touch('release')};
 return <Pressable testID={home?'hero-orb':'ask-ball'} accessibilityRole="button" accessibilityLabel={home?'Touch the ball to receive your reading':'Touch the ball'} {...grip} onPressIn={()=>haptic('touch')} onPress={()=>{if(spin.dragged){spin.dragged=false;return}onPress?.()}} style={{...noScroll,position:'absolute',left:x-hit,top:y-hit,width:hit*2,height:hit*2,borderRadius:hit}}/>;
}

export function OmenCard({busy,label='Today’s insight',children,...props}:React.PropsWithChildren<{busy?:boolean;label?:string;testID?:string;ref?:React.Ref<View>}>){
 return <View {...props} accessibilityState={{busy}} style={{padding:18,gap:10}}>
  <Surface kind="card">
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Txt style={styles.label}>{label}</Txt>
   <Txt style={[styles.label,{color:colors.gold}]}>Free</Txt>
  </View>
  {children}
 </Surface></View>;
}
export const omenTextStyle={fontFamily:fonts.display,...styles.heading,color:colors.ivory};

// The reference artboards' line icons.
const icon=(d:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const tabIcons:Record<string,string>={
 Home:icon('<path d="M12 2.8c1.6 1.9 1.6 3.4 0 4.5-1.6-1.1-1.6-2.6 0-4.5z"/><rect x="9.5" y="9.5" width="5" height="9.5" rx="0.8"/><path d="M6.5 21h11"/>'),
 Sky:icon('<rect x="3.5" y="5" width="9" height="13.5" rx="1.6" transform="rotate(-9 8 11.75)"/><rect x="11.5" y="5" width="9" height="13.5" rx="1.6" transform="rotate(9 16 11.75)"/>'),
 History:icon('<path d="M6.5 3h11M6.5 21h11M8 3c0 4.5 8 5 8 9s-8 4.5-8 9M16 3c0 4.5-8 5-8 9s8 4.5 8 9"/>'),
 You:icon('<circle cx="12" cy="8.5" r="5"/><path d="M12 13.5V22M8.5 18.5h7"/>')
};
const askBall='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 54"><defs><radialGradient id="g" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#FBE7BE"/><stop offset=".38" stop-color="#D49A4C"/><stop offset=".78" stop-color="#6B3E18"/><stop offset="1" stop-color="#2A1709"/></radialGradient></defs><circle cx="27" cy="27" r="27" fill="url(#g)"/></svg>';
export const tabs=['Home','Sky','Ask','History','You'] as const;
export type Tab=typeof tabs[number];
// The floating glass tab bar shared by every tab, with the raised gold ball for Ask in the centre.
export function HomeTabBar({current,disabled,reduce,bottom,onTab}:{current:string;disabled:boolean;reduce:boolean;bottom:number;onTab:(tab:Tab)=>void}){
 const label={fontFamily:fonts.sansMedium,fontSize:11,lineHeight:14,letterSpacing:.44};
 return <View accessibilityRole="tablist" style={{position:'absolute',left:14,right:14,bottom:bottom+barInset,height:homeTabBarHeight,flexDirection:'row'}}>
  <View pointerEvents="none" style={{position:'absolute',left:0,top:0,right:0,bottom:0,borderRadius:26,borderWidth:1,borderColor:'rgba(227,199,143,.2)',backgroundColor:'rgba(18,12,9,.74)',boxShadow:'0 10px 30px rgba(0,0,0,.35)',...{backdropFilter:'blur(18px) saturate(1.2)'}}}/>
  {tabs.map(t=>{const on=t===current;return <Pressable disabled={disabled} testID={`tab-${t.toLowerCase()}`} key={t} accessibilityRole="tab" aria-selected={on} accessibilityState={{selected:on}} accessibilityLabel={t==='Ask'?'Ask the crystal ball':t} onPress={()=>onTab(t)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',gap:t==='Ask'?4:5}}>
   {t==='Ask'?<View style={{marginTop:-26,width:54,height:54,borderRadius:27,boxShadow:'0 0 0 1px rgba(227,199,143,.55), 0 0 0 5px rgba(20,14,10,.9), 0 0 28px rgba(232,170,90,.4)'}}><AskOrb size={54} reduce={reduce} fallback={<SvgXml aria-hidden xml={askBall} width={54} height={54}/>}/></View>:<SvgXml aria-hidden xml={tabIcons[t].replaceAll('currentColor',on?colors.gold:colors.inactive)} width={22} height={22}/>}
   <Txt allowFontScaling={false} style={[label,{color:on?colors.ivory:colors.inactive}]}>{t}</Txt>
  </Pressable>})}
 </View>;
}
