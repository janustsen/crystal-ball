import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadDailyOmen,type Omen} from './daily-omen';
import {localDay} from './retention';
import {requestOmen} from './api';
import {useStore} from './store';
import {styles,Txt,colors} from './ui';
import {updateOmenWidget} from './omen-widget';

export function DailyOmen(){
 const {state}=useStore(),[omen,setOmen]=useState<Omen|null>(null);
 useEffect(()=>{
  let mounted=true;
  const refresh=()=>{
   if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
   void loadDailyOmen(AsyncStorage,state.facts,requestOmen).then(next=>{if(mounted){setOmen(next);updateOmenWidget(next)}}).catch(()=>{if(mounted)setOmen({day:localDay(),text:null})});
  };
  refresh();const timer=setInterval(refresh,60000),listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{mounted=false;clearInterval(timer);listener.remove()};
 },[state.facts]);
 return <View testID="daily-omen" style={styles.panel}><Txt style={[styles.caption,{color:colors.gold}]}>Today’s omen · free</Txt><Txt accessibilityLiveRegion="polite" display style={{fontSize:26,lineHeight:31,marginTop:8}}>{omen?(omen.text??'The stars are quiet today. Come back tomorrow.'):'A little starlight is finding you…'}</Txt></View>;
}
