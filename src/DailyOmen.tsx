import React,{useEffect,useState} from 'react';
import {AppState,Pressable,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadDailyOmen,omenTries,type Omen} from './daily-omen';
import {currentOmen,localDay} from './retention';
import {requestOmen} from './api';
import {useStore} from './store';
import {CardHeader,Txt,colors,styles} from './ui';
import {Surface} from './Surface';
import {OmenCard,omenTextStyle} from './Home';
import {answerWhisper,keepWhisper,lastWhisper} from './whisper';
import {haptic} from './native';
import type {Whisper} from './types';

const outcomes={yes:'Yes',no:'Not quite',pending:'Not yet'} as const;
const thanks={yes:'Yes saved. Today’s whisper waits below.',no:'Not quite saved. The Ball can miss.',pending:'Not yet saved. Some whispers take their time.'} as const;
// The morning check for the latest whisper: one tap, then it shows the answer for the rest of the day.
function WhisperCheck({whisper}:{whisper:Whisper}){
 const {state,update}=useStore();
 return <View testID="whisper-check" style={{padding:18}}><Surface kind="card">
  <CardHeader title="Did yesterday’s whisper land?" label="Whisper"/>
  <Txt style={[styles.strong,{marginTop:10}]}>{whisper.text}</Txt>
  {whisper.outcome?<Txt testID="whisper-check-saved" accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{thanks[whisper.outcome]}</Txt>:<View style={[styles.row,state.largeText?{flexDirection:'column',alignItems:'stretch'}:{}]}>{(Object.keys(outcomes) as (keyof typeof outcomes)[]).map(outcome=><Pressable testID={`whisper-check-${outcome}`} key={outcome} accessibilityRole="button" onPress={()=>{haptic('success');update(s=>({...s,whispers:answerWhisper(s.whispers,whisper.day,outcome)}))}} style={{paddingVertical:10,paddingHorizontal:12,minHeight:44,marginTop:12,alignItems:'center'}}><Surface kind="chip"><Txt style={styles.chip}>{outcomes[outcome]}</Txt></Surface></Pressable>)}</View>}
 </Surface></View>;
}

export function DailyOmen({aiConsent='',onRead,cardRef}:{aiConsent?:string;onRead?:()=>void;cardRef?:React.Ref<View>}){
 const {state,update,backupBusy}=useStore(),[omen,setOmen]=useState<Omen|null>(null),today=localDay(),last=lastWhisper(state.whispers,today);
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
 const current=currentOmen(omen),whisper=current?.text?current.whisper:null;
 // The first whisper shown each day is the one checked next morning; the carried previous whisper covers a day Home missed.
 const previous=current?.previous;
 useEffect(()=>{
  const unsaved=[current&&whisper?{day:current.day,whisper}:null,previous].filter((w):w is {day:string;whisper:string}=>!!w&&!state.whispers?.some(saved=>saved.day===w.day));
  if(!backupBusy&&unsaved.length)update(s=>({...s,whispers:unsaved.reduce((list,w)=>keepWhisper(list,w.day,w.whisper),s.whispers)}));
 },[current?.day,whisper,previous?.day,previous?.whisper,state.whispers,backupBusy]);
 useEffect(()=>{if(!backupBusy&&current?.text!=null)onRead?.()},[current?.day,current?.text,backupBusy]);
 const retrying=current&&current.text===null&&(current.tries??omenTries)<omenTries;
 return <>
  {last&&(!last.outcome||last.checkedInAt===today)?<WhisperCheck whisper={last}/>:null}
  <OmenCard ref={cardRef} testID="daily-omen" busy={!current||!!retrying}>
   <Txt accessibilityLiveRegion="polite" style={omenTextStyle}>{current?(current.text??(retrying?'The stars are gathering. The Ball will look again shortly.':'The stars are quiet today. Come back tomorrow.')):'A little starlight is finding you…'}</Txt>
   {whisper?<View testID="omen-whisper" style={{borderTopWidth:1,borderTopColor:colors.line,paddingTop:12,marginTop:4,gap:6}}>
    <Txt style={styles.label}>Tonight’s whisper</Txt>
    <Txt style={styles.strong}>{whisper}</Txt>
   </View>:null}
  </OmenCard>
 </>;
}
