import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Linking,Platform,Pressable,View} from 'react-native';
import {Action,colors,styles,Txt} from './ui';
import {readingPassages} from './reading-passages';
import {readingAnswers} from './reading-answers';
import {useStore} from './store';
import type {Prediction} from './types';
export function WhyDetails({prediction,onClose,onUpgrade}:{prediction:Prediction;onClose:()=>void;onUpgrade:()=>void}){
 const {state}=useStore();
 const [section,setSection]=useState<string|null>(state.plus?null:'reason');
 const [contextOpen,setContextOpen]=useState(false);
 const returnFocus=useRef<string|null>(null);
 const groups=[
  {id:'reason',title:'Why this forecast',detail:'The scenario and its limits',body:<View testID="reason-passages">{(prediction.reasonSections||readingPassages(state.plus?(prediction.deeperWhy||prediction.why):prediction.why).map((body,index)=>({title:`Passage ${index+1}`,body}))).map(({title,body},index)=><View key={index} style={{paddingBottom:20,marginBottom:20,borderBottomWidth:1,borderColor:'#614C3433'}}><Txt accessibilityRole="header" style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{title}</Txt><Txt testID="reason-body" style={{fontSize:17,lineHeight:26,fontWeight:'400'}}>{body+' '}</Txt></View>)}</View>},
  {id:'answers',title:'Your answers',detail:`${Object.keys(prediction.facts).length} details you supplied`,body:readingAnswers(prediction).map(({key,label,answer})=><View key={key} style={{marginBottom:24}}><Txt style={[styles.caption,{color:colors.gold,marginBottom:8}]}>{label}</Txt><Txt style={{fontSize:17,lineHeight:26}}>{answer}</Txt></View>)},
  {id:'assumptions',title:'Assumptions',detail:`${prediction.assumptions.length} scenario condition${prediction.assumptions.length===1?'':'s'}`,body:prediction.assumptions.length?prediction.assumptions.map((assumption,index)=><Txt key={index} style={{marginBottom:20,fontSize:17,lineHeight:26}}>{assumption}</Txt>):<Txt>No additional assumptions recorded.</Txt>},
  {id:'sources',title:'Current sources',detail:prediction.sources.length?`${prediction.sources.length} background sources`:'No current sources found',body:prediction.sources.length?prediction.sources.map(source=><Pressable key={source.url} accessibilityRole="link" onPress={()=>Linking.openURL(source.url)} style={{minHeight:48,paddingVertical:20,borderBottomWidth:1,borderColor:'#614C3466'}}><Txt style={[styles.caption,{color:colors.gold}]}>{source.publisher}</Txt><Txt style={[styles.caption,{marginTop:4,marginBottom:12}]}>{new Date(source.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</Txt><Txt style={{fontSize:17,lineHeight:26}}>{source.title}</Txt><Txt style={[styles.caption,{color:colors.ice,marginTop:12}]}>Open source ↗</Txt></Pressable>):<Txt>No relevant current sources found.</Txt>}
 ];
 const active=groups.find(group=>group.id===section);
 function overview(){returnFocus.current=section;setSection(null)}
 useEffect(()=>{
  if(Platform.OS==='web'){
   const restoring=!section&&returnFocus.current;
   const target=document.querySelector<HTMLElement>(restoring?`[data-testid="why-${returnFocus.current}"]`:'[data-testid="why-heading"]');
   target?.setAttribute('tabindex',restoring?'0':'-1');target?.focus({preventScroll:true});
   if(restoring)target?.scrollIntoView({block:'nearest'});else document.querySelector('[data-testid="why-top"]')?.scrollIntoView({block:'start'});
  }else AccessibilityInfo.announceForAccessibility(active?.title||'Behind the mist');
  returnFocus.current=null;
 },[section]);
 useEffect(()=>{if(Platform.OS==='web'||!state.plus||!section)return;const handler=BackHandler.addEventListener('hardwareBackPress',()=>{overview();return true});return()=>handler.remove()},[section,state.plus]);
 const back=<Pressable testID="why-disclosure" accessibilityRole="button" accessibilityLabel="Back to forecast" onPress={onClose} style={{minHeight:52,paddingVertical:16,marginTop:16,borderBottomWidth:1,borderColor:'#614C3466'}}><Txt style={{color:colors.ice}}>‹ Back to forecast</Txt></Pressable>;
 return <>
  <View testID="why-top">
   {!active||!state.plus?back:null}
   {active&&state.plus?<Pressable testID="why-all-evidence" accessibilityRole="button" onPress={overview} style={{minHeight:48,justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ All evidence</Txt></Pressable>:null}
   <Txt testID="why-heading" accessibilityRole="header" display style={{fontSize:28,lineHeight:34,marginVertical:12}}>{active?.title||'Behind the mist'}</Txt>
   {active?<Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.label}</Txt>:null}
  </View>
  {active?<>{prediction.astrology&&active.id==='reason'?<Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.astrology}</Txt>:null}{active.id==='sources'?<Txt style={[styles.caption,{marginBottom:16}]}>These sources provide background. They do not verify the forecast.</Txt>:null}{active.body}</>:groups.map(group=><Pressable key={group.id} testID={`why-${group.id}`} accessibilityRole="button" accessibilityLabel={`${group.title} · ${group.detail}`} onPress={()=>setSection(group.id)} style={{minHeight:64,paddingVertical:20,borderBottomWidth:1,borderColor:'#614C3466',flexDirection:'row',alignItems:'center',gap:16}}><View style={{flex:1}}><Txt style={{fontSize:18,lineHeight:26}}>{group.title}</Txt><Txt style={[styles.caption,{marginTop:6}]}>{group.detail}</Txt></View><Txt aria-hidden style={{color:colors.gold,fontSize:26}}>›</Txt></Pressable>)}
  {!state.plus?<Action label="Go deeper with Plus" quiet onPress={onUpgrade}/>:null}
  {!active?<><Pressable testID="why-context" accessibilityRole="button" aria-expanded={contextOpen} accessibilityState={{expanded:contextOpen}} onPress={()=>setContextOpen(!contextOpen)} style={{minHeight:52,paddingVertical:16}}><Txt style={{color:colors.ice}}>Read the forecast {contextOpen?'⌃':'⌄'}</Txt></Pressable>{contextOpen?<><Txt style={{fontSize:18,lineHeight:26}}>{prediction.headline}</Txt><Txt style={[styles.caption,{color:colors.gold,marginTop:8}]}>{prediction.label}</Txt></>:null}</>:null}
  {state.plus&&active?back:null}
 </>;
}
