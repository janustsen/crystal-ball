import {useEffect,useState} from 'react';
import {AccessibilityInfo,BackHandler,Platform,Pressable,View} from 'react-native';
import {BirthdayInput} from './BirthdayInput';
import {PaperButton,Action,Txt,styles,colors} from './ui';
import {ageGroup,sunSign} from './profile';
import {validateFact} from './questions';
import type {Facts} from './types';

export function Onboarding({onFinish,onBlock,blocked=false}:{onFinish:(facts:Facts,ageConfirmed?:boolean)=>void;onBlock:()=>void;blocked?:boolean}){
 const [step,setStep]=useState(0),[birthday,setBirthday]=useState(''),[focus,setFocus]=useState(''),[error,setError]=useState(''),[confirming,setConfirming]=useState(false),[correcting,setCorrecting]=useState(false);
 useEffect(()=>{
  const id=blocked&&!correcting?'age-restriction':confirming&&!blocked?'age-confirmation-heading':step===1?'onboarding-focus-heading':blocked?'age-correction-heading':'onboarding-birthday-heading';
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>(`[data-testid=${id}]`);heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});document.querySelector('[data-testid=screen-scroll]')?.scrollTo({top:0});}
  else AccessibilityInfo.announceForAccessibility(id==='age-restriction'?'Crystal Ball is for ages 13 and up.':id==='age-confirmation-heading'?'Are you 13 or older?':id==='onboarding-focus-heading'?'Your focus':blocked?'Correct your birthday':'Your birthday');
  if(blocked&&correcting){const back=BackHandler.addEventListener('hardwareBackPress',()=>{setCorrecting(false);return true});return()=>back.remove();}
 },[blocked,correcting,step,confirming]);
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
 if(confirming&&!blocked)return <><Txt testID="age-confirmation-heading" accessibilityRole="header" display>Are you 13 or older?</Txt><Txt style={[styles.caption,{marginTop:12}]}>No birthday needed.</Txt><Action testID="confirm-age" label="I’m 13 or older" onPress={()=>onFinish({},true)}/><Action testID="decline-age" label="I’m under 13" quiet onPress={()=>{setConfirming(false);onBlock()}}/></>;
 return <>
  <Txt display style={{marginTop:30,marginBottom:16}}>Come inside.</Txt>

  <Txt style={styles.caption}>{step+1} of 2</Txt>
  <Txt testID={step===1?'onboarding-focus-heading':blocked?'age-correction-heading':'onboarding-birthday-heading'} accessibilityRole="header" display style={{marginTop:8,fontSize:22,lineHeight:28}}>{blocked&&step===0?'Correct your birthday':step===0?'Your birthday':'Your focus'}</Txt>
  <Txt style={[styles.caption,{marginTop:8,marginBottom:12}]}>{blocked&&step===0?'Enter your actual birthday. Access still requires age 13 or older.':step===0?'13 and up. Your birthday sets your Sun sign.':'Choose a charm. Or skip.'}</Txt>
  {step===0?<>
   <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:12}}><Txt style={[styles.caption,{flex:1}]}>Birthday{blocked?'':' · optional'}</Txt>{!blocked?<Pressable testID="skip-for-now" accessibilityRole="button" onPress={skip} style={{minHeight:44,minWidth:44,justifyContent:'center'}}><Txt style={{color:colors.ice}}>Skip</Txt></Pressable>:null}</View>
   <BirthdayInput testID="onboarding-birthday" error={error} value={birthday} onChange={setBirthday}/>

   <Action testID="continue" label={blocked?"Check birthday":"Continue"} onPress={next}/>{blocked?<Action label="Back to age requirement" quiet onPress={()=>setCorrecting(false)}/>:null}
  </>:<>
   {sunSign(birthday)?<Txt style={styles.caption}>Your Sun sign · {sunSign(birthday)?.replace(/^./,letter=>letter.toUpperCase())}</Txt>:null}
   <View style={{marginTop:8}}>{['Work & purpose','Love & friendships','Learning & growth','A fresh start'].map(value=><PaperButton key={value} testID={value.toLowerCase().replace(/[^a-z0-9]+/g,'-')} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{selected:focus===value}} aria-pressed={focus===value} onPress={()=>setFocus(value)} style={{minHeight:56,paddingVertical:16,borderBottomWidth:0,borderColor:'transparent',flexDirection:'row',alignItems:'center',gap:12}}><Txt style={{flex:1,color:focus===value?colors.gold:colors.ivory}}>{value}</Txt><Txt aria-hidden style={{color:colors.gold,width:24}}>{focus===value?'✓':''}</Txt></PaperButton>)}</View>
   <Action testID="meet-the-ball" label={focus?"Save focus and continue":"Skip focus"} onPress={()=>onFinish({...birthday.trim()?{birthday:birthday.trim()}:{},...focus?{current_focus:focus}:{}})}/>
   <Action label="Back" quiet onPress={()=>setStep(0)}/>
  </>}
  {!blocked&&step===1&&!!focus?<Action testID="skip-for-now" label="Skip focus" quiet onPress={skip}/>:null}
 </>;
}
