import {useEffect,useState} from 'react';
import {AccessibilityInfo,BackHandler,Platform,Pressable,View} from 'react-native';
import {BirthdayInput} from './BirthdayInput';
import {Action,Txt,styles,colors} from './ui';
import {ageGroup,sunSign} from './profile';
import {validateFact} from './questions';
import type {Facts} from './types';

export function Onboarding({onFinish,onBlock,blocked=false}:{onFinish:(facts:Facts,ageConfirmed?:boolean)=>void;onBlock:()=>void;blocked?:boolean}){
 const [step,setStep]=useState(0),[birthday,setBirthday]=useState(''),[focus,setFocus]=useState(''),[error,setError]=useState(''),[confirming,setConfirming]=useState(false),[correcting,setCorrecting]=useState(false);
 useEffect(()=>{
  if(!blocked)return;
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>(correcting?'[data-testid=age-correction-heading]':'[data-testid=age-restriction]');heading?.setAttribute('tabindex','-1');heading?.focus();}
  else AccessibilityInfo.announceForAccessibility(correcting?'Correct your birthday':'Crystal Ball is for ages 13 and up.');
  if(correcting){const back=BackHandler.addEventListener('hardwareBackPress',()=>{setCorrecting(false);return true});return()=>back.remove();}
 },[blocked,correcting]);
 function next(){
  try{if(blocked&&!birthday.trim())throw new Error('Enter a birthday to correct your age.');if(birthday.trim())validateFact('birthday',birthday.trim());}catch(e){setError(e instanceof Error?e.message:'Check your birthday.');return;}
  if(ageGroup(birthday.trim())==='under13'){onBlock();setCorrecting(false);setError('');return;}
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
 if(blocked&&!correcting)return <View style={{paddingTop:32}}><Txt style={[styles.caption,{color:colors.gold}]}>Age requirement</Txt><Txt testID="age-restriction" accessibilityRole="header" display style={{fontSize:30,lineHeight:36,marginVertical:16}}>Crystal Ball is for ages 13 and up.</Txt><Txt>You cannot continue with the age you entered.</Txt><Txt style={[styles.caption,{marginTop:16}]}>If you entered it incorrectly, you can correct your birthday.</Txt><Action testID="correct-birthday" label="Correct my birthday" quiet onPress={()=>{setBirthday('');setError('');setStep(0);setCorrecting(true)}}/></View>;
 if(confirming&&!blocked)return <><Txt display>Are you 13 or older?</Txt><Txt style={styles.caption}>No birthday needed. Teen-safe defaults apply.</Txt><Action testID="confirm-age" label="I’m 13 or older" onPress={()=>onFinish({},true)}/><Action testID="decline-age" label="I’m under 13" quiet onPress={()=>{setConfirming(false);onBlock()}}/></>;
 return <>
  <Txt display style={{marginBottom:16}}>Your forecast. Then check back.</Txt>
  <Txt style={styles.caption}>Ask what’s ahead. Get a forecast and a due date. Come back to say Yes, Not quite, or Not yet. The Ball can miss — your story matters either way.</Txt>
  <Txt style={styles.caption}>A little about you · {step+1} of 2</Txt>
  <Txt testID={blocked&&step===0?'age-correction-heading':undefined} accessibilityRole="header" display style={{marginTop:16,fontSize:30,lineHeight:36}}>{blocked&&step===0?'Correct your birthday':step===0?'When is your birthday?':'What’s on your mind lately?'}</Txt>
  <Txt style={[styles.caption,{marginTop:12,marginBottom:24}]}>{blocked&&step===0?'Enter your actual birthday. Access still requires age 13 or older.':step===0?'13 and up. Your birthday sets your Sun sign.':'Choose one, or skip. You can change it later.'}</Txt>
  {step===0?<>
   <Txt style={[styles.caption,{marginBottom:12}]}>Birthday{blocked?'':' · optional'}</Txt>
   <BirthdayInput testID="onboarding-birthday" value={birthday} onChange={setBirthday}/>

   {error?<Txt accessibilityRole="alert">{error}</Txt>:null}
   <Action testID="continue" label={blocked?"Check birthday":"Continue"} onPress={next}/>{blocked?<Action label="Back to age requirement" quiet onPress={()=>setCorrecting(false)}/>:null}
  </>:<>
   {sunSign(birthday)?<Txt style={styles.caption}>Your Sun sign · {sunSign(birthday)}</Txt>:null}
   <View style={{marginTop:8}}>{['Work & purpose','Love & friendships','Learning & growth','A fresh start'].map(value=><Pressable key={value} testID={value.toLowerCase().replace(/[^a-z0-9]+/g,'-')} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{selected:focus===value}} aria-pressed={focus===value} onPress={()=>setFocus(value)} style={{minHeight:56,paddingVertical:16,borderBottomWidth:1,borderColor:focus===value?colors.gold:'#614C3466',flexDirection:'row',alignItems:'center',gap:12}}><Txt style={{flex:1,color:focus===value?colors.gold:colors.ivory}}>{value}</Txt><Txt aria-hidden style={{color:colors.gold,width:24}}>{focus===value?'✓':''}</Txt></Pressable>)}</View>
   <Action testID="meet-the-ball" label={focus?"Meet the Ball":"Continue without a focus"} onPress={()=>onFinish({...birthday.trim()?{birthday:birthday.trim()}:{},...focus?{current_focus:focus}:{}})}/>
   <Action label="Back" quiet onPress={()=>setStep(0)}/>
  </>}
  {!blocked&&(step===0||!!focus)?<Action testID="skip-for-now" label={step===0?"Skip for now":"Skip focus"} quiet onPress={skip}/>:null}
 </>;
}
