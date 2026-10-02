import {useEffect,useState} from 'react';
import {AccessibilityInfo,BackHandler,Platform,Pressable,View} from 'react-native';
import {Action,Input,Txt,colors,styles} from './ui';
import {validPersonName} from './profile';
export function QuestionSubject({personMode,personName,onSave,onCancel}:{personMode:boolean;personName:string;onSave:(someone:boolean,name:string)=>void;onCancel:()=>void}){
 const [someone,setSomeone]=useState(personMode),[name,setName]=useState(personName);
 useEffect(()=>{
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid="subject-heading"]');heading?.setAttribute('tabindex','-1');heading?.focus();}
  else AccessibilityInfo.announceForAccessibility('Who is it about?');
  const back=BackHandler.addEventListener('hardwareBackPress',()=>{onCancel();return true});return()=>back.remove();
 },[]);
 return <>
  <Txt testID="subject-heading" accessibilityRole="header" display style={{fontSize:28,lineHeight:34,marginBottom:20}}>Who is it about?</Txt>
  {([false,true] as const).map(value=><Pressable key={String(value)} testID={value?'ask-about-someone':'ask-about-myself'} accessibilityRole="button" accessibilityLabel={value?'Ask about someone':'Ask about myself'} accessibilityState={{selected:someone===value}} aria-pressed={someone===value} onPress={()=>setSomeone(value)} style={{minHeight:52,paddingVertical:12,borderBottomWidth:1,borderColor:someone===value?colors.gold:'#614C3466',flexDirection:'row',alignItems:'center',gap:12}}><Txt style={{flex:1,color:someone===value?colors.gold:colors.muted}}>{value?'Someone':'Myself'}</Txt><Txt aria-hidden style={{width:24,color:colors.gold}}>{someone===value?'✓':''}</Txt></Pressable>)}
  {someone?<View><Txt style={[styles.caption,{marginTop:20}]}>First name</Txt><Input testID="person-name" accessibilityLabel="Their first name" value={name} onChangeText={setName} maxLength={40} placeholder="Alex" placeholderTextColor={colors.muted} style={styles.input}/><Txt style={[styles.caption,{marginVertical:12}]}>For fun. The Ball knows nothing about them; nobody is notified.</Txt></View>:null}
  <Action testID="save-subject" label={someone?'Use this person':'Ask about myself'} disabled={someone&&!validPersonName(name.trim())} onPress={()=>onSave(someone,someone?name.trim():'')}/>
  <Action testID="cancel-subject" label="Cancel changes" quiet onPress={onCancel}/>
 </>;
}
