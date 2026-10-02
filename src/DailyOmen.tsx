import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadDailyOmen,type Omen} from './daily-omen';
import {currentOmen} from './retention';
import {requestOmen} from './api';
import {useStore} from './store';
import {styles,Txt,colors} from './ui';

export function DailyOmen({aiConsent=''}:{aiConsent?:string}){
 const {state}=useStore(),[omen,setOmen]=useState<Omen|null>(null),[storageError,setStorageError]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const refresh=()=>{
   if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
   setOmen(previous=>currentOmen(previous));
   void loadDailyOmen(AsyncStorage,state.facts,facts=>requestOmen(facts,state,aiConsent)).then(next=>{if(mounted){setOmen(currentOmen(next));setStorageError(false)}}).catch(()=>{if(mounted)setStorageError(true)});
  };
  refresh();const timer=setInterval(refresh,60000),listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{mounted=false;clearInterval(timer);listener.remove()};
 },[state.facts,state.sunSign,state.birthday,state.ageConfirmed,aiConsent]);
 const current=currentOmen(omen);
 return <View testID="daily-omen" accessibilityState={{busy:!current&&!storageError}} style={[styles.panel,{paddingVertical:8},state.largeText&&{marginTop:8}]}><Txt style={[styles.caption,{color:colors.gold}]}>Today’s omen · free</Txt><View accessibilityLiveRegion="polite">{storageError?<><Txt style={{marginTop:8}}>Omen storage unavailable.</Txt><Txt style={[styles.caption,{marginTop:4}]}>We’ll check again shortly.</Txt></>:current&&!current.text?<><Txt style={{marginTop:8}}>No omen available.</Txt><Txt style={[styles.caption,{marginTop:4}]}>Today’s attempt is used.</Txt><Txt style={styles.caption}>Next attempt: tomorrow.</Txt></>:<Txt display style={{fontSize:16,lineHeight:22,marginTop:8}}>{current?.text??'Finding your omen…'}</Txt>}</View></View>;
}
