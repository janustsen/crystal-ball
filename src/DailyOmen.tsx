import React,{useEffect,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadDailyOmen,type Omen} from './daily-omen';
import {currentOmen,localDay} from './retention';
import {requestOmen} from './api';
import {useStore} from './store';
import {Txt} from './ui';
import {OmenCard,omenTextStyle} from './Home';

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
 return <OmenCard testID="daily-omen" busy={!current}><Txt accessibilityLiveRegion="polite" style={omenTextStyle}>{current?(current.text??'The stars are quiet today. Come back tomorrow.'):'A little starlight is finding you…'}</Txt></OmenCard>;
}
