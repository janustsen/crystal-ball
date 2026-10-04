import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Linking,Platform,Pressable,View} from 'react-native';
import {Action,PaperButton,colors,styles,Txt} from './ui';
import {readingPassages} from './reading-passages';
import {readingAssumptions} from './reading-assumptions';
import {readingAnswers} from './reading-answers';
import {useStore} from './store';
import type {Prediction} from './types';
export function WhyDetails({prediction,onClose,onUpgrade}:{prediction:Prediction;onClose:()=>void;onUpgrade:()=>void}){
 const {state}=useStore();
 const [linkError,setLinkError]=useState(''),[section,setSection]=useState<string|null>(null);
 const previousSection=useRef<string|null>(null);
 const assumptions=readingAssumptions(prediction);
 const groups=[
  {id:'reason',title:'Why this forecast',detail:'The scenario and its limits',body:<View testID="reason-passages">{!prediction.reasonSections?<Txt style={[styles.caption,{marginBottom:16}]}>This explanation was saved with your reading.</Txt>:null}{(prediction.reasonSections||readingPassages(state.plus?(prediction.deeperWhy||prediction.why):prediction.why).map(body=>({title:undefined,body}))).map(({title,body},index)=><View key={index} style={{paddingBottom:12,marginBottom:12,borderBottomWidth:0,borderColor:'#614C3433'}}>{title?<Txt accessibilityRole="header" style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{title}</Txt>:null}{readingPassages(body).map((passage,i)=><Txt key={i} testID="reason-body" style={{fontSize:16,lineHeight:25,fontWeight:'400',marginBottom:12}}>{passage+' '}</Txt>)}</View>)}</View>},
  {id:'answers',title:'Your answers',detail:`${Object.keys(prediction.facts).length} details you supplied`,body:readingAnswers(prediction).map(({key,label,answer})=><View key={key} style={{paddingBottom:12,marginBottom:12,borderBottomWidth:0,borderColor:'#614C3433'}}><Txt style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{label}</Txt>{readingPassages(answer).map((passage,i)=><Txt key={i} style={{fontSize:16,lineHeight:25,marginBottom:12}}>{passage}</Txt>)}</View>)},
  {id:'assumptions',title:'Assumptions',detail:`${assumptions.length} scenario condition${assumptions.length===1?'':'s'}`,body:assumptions.length?assumptions.map((assumption,index)=><View key={index} style={{marginBottom:20}}><Txt accessibilityRole="header" style={[styles.caption,{color:colors.gold,marginBottom:8}]}>Condition {index+1}</Txt>{readingPassages(assumption).map((passage,i)=><Txt key={i} style={{marginBottom:12,fontSize:16,lineHeight:25}}>{passage}</Txt>)}</View>):<Txt>No separate assumptions were recorded for this reading.</Txt>},
  {id:'sources',title:'Background sources',detail:prediction.sources.length?`${prediction.sources.length} background sources`:'No current sources found',body:prediction.sources.length?prediction.sources.map(source=><Pressable key={source.url} accessibilityRole="link" accessibilityLabel={`Open ${source.publisher}: ${source.title}`} onPress={()=>{setLinkError('');void Linking.openURL(source.url).catch(()=>setLinkError('The source could not be opened. Try again.'));}} style={{minHeight:48,paddingVertical:20,borderBottomWidth:0,borderColor:'#614C3466'}}><Txt style={[styles.caption,{color:colors.gold}]}>{source.publisher} · Open source ↗</Txt><Txt style={[styles.caption,{marginTop:4,marginBottom:12}]}>{new Date(source.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</Txt><Txt style={{fontSize:17,lineHeight:26}}>{source.title}</Txt></Pressable>):<Txt>No relevant current sources found.</Txt>}
 ];
 useEffect(()=>{
  if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid="why-heading"]');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});document.querySelector('[data-testid="why-top"]')?.scrollIntoView({block:'start'});}
  else AccessibilityInfo.announceForAccessibility(state.plus?'Reading details':'Why this forecast');
 },[]);
 // Closing from the end of a long section returns focus to its disclosure.
 useEffect(()=>{
  const closed=previousSection.current;previousSection.current=section;
  if(Platform.OS!=='web'||section!==null||!closed)return;
  const trigger=document.querySelector<HTMLElement>(`[data-testid="open-why-${closed}"]`);trigger?.focus({preventScroll:true});trigger?.scrollIntoView({block:'nearest'});
 },[section]);
 return <>
  <View testID="why-top"><Pressable testID="why-disclosure" accessibilityRole="button" accessibilityLabel="Back to forecast" onPress={onClose} style={{minHeight:48,justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ Back to forecast</Txt></Pressable><Txt testID="why-heading" accessibilityRole="header" display style={{fontSize:22,lineHeight:28,marginVertical:12}}>{state.plus?'Reading details':'Why this forecast'}</Txt>{!state.plus?<Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.label}</Txt>:null}</View>

  {state.plus?<View testID="reading-sections">{groups.map(group=>{const open=section===group.id;return <View key={group.id} style={{borderBottomWidth:0,borderColor:'#614C3466'}}>
   <PaperButton wood quiet testID={`open-why-${group.id}`} accessibilityRole="button" accessibilityState={{expanded:open}} aria-expanded={open} onPress={()=>{setLinkError('');setSection(open?null:group.id)}} style={({pressed})=>[styles.row,{minHeight:56,paddingVertical:12,opacity:pressed?.7:1}]}><View style={{flex:1}}><Txt style={{color:colors.ice}}>{group.title}</Txt></View><Txt accessible={false} style={{color:colors.ice,fontSize:18}}>{open?'⌃':'⌄'}</Txt></PaperButton>
   {open?<View testID={`why-${group.id}`} style={{paddingTop:18,paddingBottom:8,paddingHorizontal:12,backgroundColor:'#180f0acc'}}>{group.id==='sources'?<Txt style={[styles.caption,{marginBottom:16}]}>Background only. These sources do not verify the forecast.</Txt>:null}{group.body}{group.id==='reason'&&prediction.astrology?<Txt style={[styles.caption,{color:colors.gold,marginTop:16}]}>{prediction.astrology}</Txt>:null}<Action testID="reading-section-end" label={`Close ${group.title.toLowerCase()}`} quiet onPress={()=>setSection(null)}/></View>:null}
  </View>})}</View>:<View testID="why-reason" style={{paddingVertical:16,borderTopWidth:0,borderColor:'#614C3466'}}>{groups[0].body}{prediction.astrology?<Txt style={[styles.caption,{color:colors.gold,marginTop:16}]}>{prediction.astrology}</Txt>:null}</View>}

  {linkError?<Txt accessibilityRole="alert">{linkError}</Txt>:null}
  {!state.plus?<Action label="Go deeper with Plus" quiet onPress={onUpgrade}/>:null}
  {!state.plus?<Action testID="reading-details-back" label="Back to forecast" quiet onPress={onClose}/>:null}
 </>;
}
