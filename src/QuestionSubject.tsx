import {useEffect,useState} from 'react';
import {AccessibilityInfo,BackHandler,Platform,Pressable,View} from 'react-native';
import {Action,Input,PaperButton,Txt,colors,styles} from './ui';
import {validPersonName} from './profile';
export function QuestionSubject({personMode,personName,onSave,onCancel}:{personMode:boolean;personName:string;onSave:(someone:boolean,name:string)=>void;onCancel:()=>void}){
 const [someone,setSomeone]=useState(personMode),[name,setName]=useState(personName);
 useEffect(()=>{
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid="subject-heading"]');heading?.setAttribute('tabindex','-1');heading?.focus();}
  else AccessibilityInfo.announceForAccessibility('Who is it about?');
  const back=BackHandler.addEventListener('hardwareBackPress',()=>{onCancel();return true});return()=>back.remove();
 },[]);
 return <>
  <Txt testID="subject-heading" accessibilityRole="header" display style={{fontSize:22,lineHeight:28,marginBottom:8}}>Who is it about?</Txt>
  {([false,true] as const).map(value=><PaperButton key={String(value)} testID={value?'ask-about-someone':'ask-about-myself'} accessibilityRole="button" accessibilityLabel={value?'Ask about someone':'Ask about myself'} accessibilityState={{selected:someone===value}} aria-pressed={someone===value} onPress={()=>setSomeone(value)} style={{minHeight:52,paddingVertical:12,borderBottomWidth:0,borderColor:someone===value?colors.gold:'#614C3466',alignItems:'center',justifyContent:'center'}}><Txt>{someone===value?'✓ ':''}{value?'Someone':'Myself'}</Txt></PaperButton>)}
  {someone?<View><Txt style={[styles.caption,{marginTop:12}]}>First name</Txt><Input testID="person-name" accessibilityLabel="Their first name" value={name} onChangeText={setName} maxLength={40} placeholder="" aria-invalid={!!name.trim()&&!validPersonName(name.trim())} placeholderTextColor={colors.muted} style={styles.input}/><Txt style={[styles.caption,{marginVertical:12}]}>{!name.trim()?'Enter a first name.':!validPersonName(name.trim())?'Use one first name.':'For fun. Nobody is notified.'}</Txt></View>:null}
  <Action testID="save-subject" label={someone?'Use this person':'Ask about myself'} disabled={someone&&!validPersonName(name.trim())} onPress={()=>onSave(someone,someone?name.trim():'')}/>
  <Action testID="cancel-subject" label="Cancel changes" quiet onPress={onCancel}/>
 </>;
}
