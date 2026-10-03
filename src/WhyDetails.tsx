import {useEffect,useState} from 'react';
import {AccessibilityInfo,Linking,Platform,Pressable,View} from 'react-native';
import {Action,colors,styles,Txt} from './ui';
import {readingPassages} from './reading-passages';
import {readingAssumptions} from './reading-assumptions';
import {readingAnswers} from './reading-answers';
import {useStore} from './store';
import type {Prediction} from './types';
export function WhyDetails({prediction,onClose,onUpgrade}:{prediction:Prediction;onClose:()=>void;onUpgrade:()=>void}){
 const {state}=useStore();
 const [linkError,setLinkError]=useState(''),[contextOpen,setContextOpen]=useState(false);
 const assumptions=readingAssumptions(prediction);
 const groups=[
  {id:'reason',title:'Why this forecast',detail:'The scenario and its limits',body:<View testID="reason-passages">{!prediction.reasonSections?<Txt style={[styles.caption,{marginBottom:16}]}>Preserved explanation · this reading did not record separate reasoning sections.</Txt>:null}{(prediction.reasonSections||readingPassages(state.plus?(prediction.deeperWhy||prediction.why):prediction.why).map((body,index)=>({title:`Passage ${index+1}`,body}))).map(({title,body},index)=><View key={index} style={{paddingBottom:20,marginBottom:20,borderBottomWidth:1,borderColor:'#614C3433'}}><Txt accessibilityRole="header" style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{title}</Txt><Txt testID="reason-body" style={{fontSize:17,lineHeight:26,fontWeight:'400'}}>{body+' '}</Txt></View>)}</View>},
  {id:'answers',title:'Your answers',detail:`${Object.keys(prediction.facts).length} details you supplied`,body:readingAnswers(prediction).map(({key,label,answer})=><View key={key} style={{paddingBottom:20,marginBottom:20,borderBottomWidth:1,borderColor:'#614C3433'}}><Txt style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{label}</Txt><Txt style={{fontSize:17,lineHeight:26}}>{answer}</Txt></View>)},
  {id:'assumptions',title:'Assumptions',detail:`${assumptions.length} scenario condition${assumptions.length===1?'':'s'}`,body:assumptions.length?assumptions.map((assumption,index)=><Txt key={index} style={{marginBottom:20,fontSize:17,lineHeight:26}}>{assumption}</Txt>):<Txt>No separate assumptions were recorded for this reading.</Txt>},
  {id:'sources',title:'Background sources',detail:prediction.sources.length?`${prediction.sources.length} background sources`:'No current sources found',body:prediction.sources.length?prediction.sources.map(source=><Pressable key={source.url} accessibilityRole="link" accessibilityLabel={`Open ${source.publisher}: ${source.title}`} onPress={()=>{setLinkError('');void Linking.openURL(source.url).catch(()=>setLinkError('The source could not be opened. Try again.'));}} style={{minHeight:48,paddingVertical:20,borderBottomWidth:1,borderColor:'#614C3466'}}><Txt style={[styles.caption,{color:colors.gold}]}>{source.publisher}</Txt><Txt style={[styles.caption,{marginTop:4,marginBottom:12}]}>{new Date(source.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</Txt><Txt style={{fontSize:17,lineHeight:26}}>{source.title}</Txt><Txt style={[styles.caption,{color:colors.ice,marginTop:12}]}>Open source ↗</Txt></Pressable>):<Txt>No relevant current sources found.</Txt>}
 ];
 useEffect(()=>{
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid="why-heading"]');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});document.querySelector('[data-testid="why-top"]')?.scrollIntoView({block:'start'});}
  else AccessibilityInfo.announceForAccessibility(state.plus?'Reading details':'Why this forecast');
 },[]);
 return <>
  <View testID="why-top"><Pressable testID="why-disclosure" accessibilityRole="button" accessibilityLabel="Back to forecast" onPress={onClose} style={{minHeight:48,justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ Back to forecast</Txt></Pressable><Txt testID="why-heading" accessibilityRole="header" display style={{fontSize:22,lineHeight:28,marginVertical:12}}>{state.plus?'Reading details':'Why this forecast'}</Txt><Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.label}</Txt></View>
  {(state.plus?groups:groups.slice(0,1)).map(group=><View key={group.id} testID={`why-${group.id}`} style={{paddingVertical:16,borderTopWidth:1,borderColor:'#614C3466'}}><Txt accessibilityRole="header" display style={{fontSize:20,lineHeight:28,marginBottom:12}}>{group.title}</Txt>{group.id==='reason'&&prediction.astrology?<Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.astrology}</Txt>:null}{group.id==='sources'?<Txt style={[styles.caption,{marginBottom:16}]}>Background only. These sources do not verify the forecast.</Txt>:null}{group.body}</View>)}
  {linkError?<Txt accessibilityRole="alert">{linkError}</Txt>:null}
  {!state.plus?<Action label="Go deeper with Plus" quiet onPress={onUpgrade}/>:null}
  <Pressable testID="why-context" accessibilityRole="button" aria-expanded={contextOpen} accessibilityState={{expanded:contextOpen}} onPress={()=>setContextOpen(!contextOpen)} style={{minHeight:48,justifyContent:'center',paddingVertical:12}}><Txt style={{color:colors.ice}}>Read the forecast {contextOpen?'⌃':'⌄'}</Txt></Pressable>{contextOpen?<><Txt>{prediction.headline}</Txt><Txt style={[styles.caption,{marginTop:8}]}>{prediction.label}</Txt></>:null}
  <Action testID="reading-details-back" label="Back to forecast" quiet onPress={onClose}/>
 </>;
}
