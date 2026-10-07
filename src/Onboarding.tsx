import {useState} from 'react';
import {View} from 'react-native';
import {Action,Txt,styles,colors,Field} from './ui';
import {ageGroup,sunSign} from './profile';
import {validateFact} from './questions';
import type {Facts} from './types';
import {Surface} from './Surface';

export function Onboarding({onFinish,onBlock,blocked=false}:{onFinish:(facts:Facts,ageConfirmed?:boolean)=>void;onBlock:()=>void;blocked?:boolean}){
 const [step,setStep]=useState(0),[birthday,setBirthday]=useState(''),[focus,setFocus]=useState(''),[error,setError]=useState(''),[confirming,setConfirming]=useState(false);
 function next(){
  try{if(blocked&&!birthday.trim())throw new Error('Enter a birthday to correct your age.');if(birthday.trim())validateFact('birthday',birthday.trim());}catch(e){setError(e instanceof Error?e.message:'Check your birthday.');return;}
  if(ageGroup(birthday.trim())==='under13'){onBlock();setError('Crystal Ball is for ages 13 and up.');return;}
  if(!birthday.trim()){setConfirming(true);return;}
  setError('');setStep(1);
 }
 function skip(){
  if(blocked)return;
  if(birthday.trim()){
   try{validateFact('birthday',birthday.trim());}catch(e){setError(e instanceof Error?e.message:'Check your birthday.');return;}
   if(ageGroup(birthday.trim())==='under13'){onBlock();return;}
  }
  if(step===1&&birthday.trim()){onFinish({birthday:birthday.trim()});return;}
  setConfirming(true);
 }
 if(confirming&&!blocked)return <><Txt display>Are you 13 or older?</Txt><Txt style={styles.caption}>No birthday needed. Teen-safe defaults apply.</Txt><Action testID="confirm-age" label="I’m 13 or older" onPress={()=>onFinish({},true)}/><Action testID="decline-age" label="I’m under 13" quiet onPress={()=>{setConfirming(false);onBlock()}}/></>;
 return <>
  {blocked?<Txt accessibilityRole="alert">Crystal Ball is for ages 13 and up.</Txt>:null}
  <Txt display style={{marginBottom:16}}>Your forecast. Then check back.</Txt>
  <Txt style={styles.caption}>Ask what’s ahead. Get a forecast and a due date. Come back to say Yes, Not quite, or Not yet. The Ball can miss — your story matters either way.</Txt>
  <Txt style={styles.caption}>A little about you · {step+1} of 2</Txt>
  <Txt display style={{marginTop:16}}>{step===0?'When is your birthday?':'What’s on your mind lately?'}</Txt>
  <Txt style={[styles.caption,{marginTop:12,marginBottom:24}]}>13 and up. Your birthday sets your Sun sign.</Txt>
  {step===0?<>
   <Txt style={styles.caption}>Birthday · YYYY-MM-DD</Txt>
   <Field testID="onboarding-birthday" accessibilityLabel="Birthday YYYY-MM-DD" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={birthday} onChangeText={setBirthday} maxLength={10} style={styles.input}/>
   {error?<View style={styles.panel}><Surface kind="error"><Txt accessibilityRole="alert">{error}</Txt></Surface></View>:null}
   <Action label="Continue" onPress={next}/>
  </>:<>
   {sunSign(birthday)?<Txt style={styles.caption}>Your Sun sign · {sunSign(birthday)}</Txt>:null}
   <View style={{marginTop:8}}>{['Work & purpose','Love & friendships','Learning & growth','A fresh start'].map(value=><Action key={value} label={value} quiet={focus!==value} onPress={()=>setFocus(value)}/>)}</View>
   <Action label="Meet the Ball" onPress={()=>onFinish({...birthday.trim()?{birthday:birthday.trim()}:{},...focus?{current_focus:focus}:{}})}/>
   <Action label="Back" quiet onPress={()=>setStep(0)}/>
  </>}
  <Action label="Skip for now" quiet disabled={blocked} onPress={skip}/>
 </>;
}
