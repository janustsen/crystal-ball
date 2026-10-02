import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadDailyOmen,type Omen} from './daily-omen';
import {currentOmen,localDay} from './retention';
import {requestOmen} from './api';
import {useStore} from './store';
import {styles,Txt,colors} from './ui';

export function DailyOmen({aiConsent=''}:{aiConsent?:string}){
 const {state}=useStore(),[omen,setOmen]=useState<Omen|null>(null);
 useEffect(()=>{
  let mounted=true;
  const refresh=()=>{
   if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
   setOmen(previous=>currentOmen(previous));
   void loadDailyOmen(AsyncStorage,state.facts,facts=>requestOmen(facts,state,aiConsent)).then(next=>{if(mounted)setOmen(currentOmen(next))}).catch(()=>{if(mounted)setOmen({day:localDay(),text:null})});
  };
  refresh();const timer=setInterval(refresh,60000),listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{mounted=false;clearInterval(timer);listener.remove()};
 },[state.facts,state.sunSign,state.birthday,state.ageConfirmed,aiConsent]);
 const current=currentOmen(omen);
 return <View testID="daily-omen" accessibilityState={{busy:!current}} style={styles.panel}><Txt style={[styles.caption,{color:colors.gold}]}>Today’s omen · free</Txt><Txt accessibilityLiveRegion="polite" display style={{fontSize:19,lineHeight:26,marginTop:8}}>{current?(current.text??'The stars are quiet today. Come back tomorrow.'):'A little starlight is finding you…'}</Txt></View>;
}
