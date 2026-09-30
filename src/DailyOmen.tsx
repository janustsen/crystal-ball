import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {dailyOmen} from './retention';
import {styles,Txt,colors} from './ui';
import {updateOmenWidget} from './omen-widget';

export function DailyOmen(){
 const [omen,setOmen]=useState(()=>dailyOmen());
 useEffect(()=>{
  const refresh=()=>{const next=dailyOmen();setOmen(current=>current.day===next.day?current:next);void AsyncStorage.setItem('crystal-ball-omen-v1',JSON.stringify(next)).catch(()=>{});updateOmenWidget();};
  void AsyncStorage.getItem('crystal-ball-omen-v1').then(raw=>{if(raw){const cached=JSON.parse(raw),today=dailyOmen();if(cached.day===today.day&&cached.text===today.text)setOmen(cached)}}).catch(()=>{});
  refresh();const timer=setInterval(refresh,60000),listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{clearInterval(timer);listener.remove()};
 },[]);
 return <View testID="daily-omen" style={styles.panel}><Txt style={[styles.caption,{color:colors.gold}]}>Today’s omen · free</Txt><Txt display style={{fontSize:26,lineHeight:31,marginTop:8}}>{omen.text}</Txt></View>;
}
