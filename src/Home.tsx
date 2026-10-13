import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,View,type GestureResponderEvent} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {type BallSpin} from './RoomScene';
import {Txt,RowLink,EdgeFade,colors,fonts,styles} from './ui';
import {haptic} from './native';
import {Surface} from './Surface';
import {Enter} from './Enter';
import {AskOrb} from './AskOrb';

// The floating glass tab bar: 68 pt tall, inset 14 pt from the sides and 18 pt from the bottom safe area.
export const homeTabBarHeight=68;
export const barInset=18;
// Space the tab bar takes from the bottom of the screen, so content ends above it.
export const tabBarSpace=(bottom:number)=>bottom+barInset+homeTabBarHeight+8;
// Web lets a drag on the ball spin it instead of scrolling the page.
const noScroll={touchAction:'none'} as object;

// Home's screen content, docked below the room's ball (top): what to do, Sunday's recap, today's omen and the Inner Library.
export function Home({ready,libraryLocked,onLibrary,checkIns,recap,omen,today,omenFocus=0,top,under,bottom,reduce,direction}:{ready:boolean;libraryLocked:boolean;onLibrary:()=>void;checkIns:React.ReactNode;recap?:React.ReactNode;omen:(cardRef:React.RefObject<View|null>)=>React.ReactNode;today?:React.ReactNode;omenFocus?:number;top:number;under:number;bottom:number;reduce:boolean;direction?:number}){
 // Each omenFocus change (Today's omen step) brings the omen, whether waiting, failed or ready, into view.
 const scroll=useRef<ScrollView>(null),omenRef=useRef<View>(null),content=useRef<View>(null),edge=Math.min(under,Math.max(0,top-24)),pad=top-edge;
 useEffect(()=>{if(omenFocus&&content.current)omenRef.current?.measureLayout(content.current,(_x,y)=>scroll.current?.scrollTo({y:Math.max(0,y+pad-48),animated:!reduce}))},[omenFocus]);
 // Content starts below the ball but scrolls all the way up, fading out beneath the header (under); touches above the
 // content pass through (box-none) so the ball stays the tap and spin target.
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,top:edge,right:0,bottom}}><EdgeFade soft={36} bottom={24} style={styles.through}>
  <ScrollView ref={scroll} style={styles.through} showsVerticalScrollIndicator={false} contentContainerStyle={[{paddingTop:pad},styles.through]}><Enter reduce={reduce} direction={direction}><View ref={content} collapsable={false} style={{gap:14,paddingHorizontal:20,paddingBottom:24}}>
