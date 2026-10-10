import {useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Action,CardHeader,Txt,colors,fonts,styles} from './ui';
import {Enter} from './Enter';
import {Surface} from './Surface';
import {useStore} from './store';
import {haptic} from './native';
import {claimAskBonus,requestInsight,serverMetered} from './api';
import {askBonuses,answersPerBonus} from './billing';
import {answerAsk,areaLabels,askFor,asksOf,bonusDue,insightDue,insightEvery,nextAsk,nextInsightKind,reflection,selfAnswers,skipAsk} from './ball-asks';
import type {Insight,InsightKind} from './types';

const kindLabels:Record<InsightKind,string>={portrait:'Your portrait',enjoy:'You might enjoy',try:'Something to try',shift:'One small shift'};

// Answering from anywhere (this page or a Home shortcut) goes through here, so every 25th distinct answer grants its bonus reading.
// Without Supabase the preview credits the device; with it the server credits each bonus once.
export function useBallAsks(onNotice:(text:string,done?:boolean)=>void){
 const {state,update,saveAskProgress}=useStore(),teen=state.ageBand!=='adult',progress=asksOf(state),claiming=useRef(false);
 const due=bonusDue(progress);
 const [bonusFailed,setBonusFailed]=useState(false),[bonusAttempt,setBonusAttempt]=useState(0);
 useEffect(()=>{
  if(!due||claiming.current)return;
  const granted=askBonuses(progress.seen.length),done=`${answersPerBonus} answers. A bonus reading is yours.`;
  claiming.current=true;setBonusFailed(false);
  void (serverMetered?claimAskBonus(progress.seen):Promise.resolve(undefined)).then(balance=>saveAskProgress(s=>({...s,credits:s.credits+(serverMetered?0:Math.max(0,granted-asksOf(s).bonus)),asks:{...asksOf(s),bonus:Math.max(asksOf(s).bonus,granted)}}),balance)).then(()=>{onNotice(done,true)}).catch(()=>{setBonusFailed(true)}).finally(()=>{claiming.current=false});
 },[due,progress.seen.length,bonusAttempt]);
 return {teen,progress,bonusPending:due>0,bonusFailed,retryBonus:()=>setBonusAttempt(n=>n+1),next:nextAsk(state,teen),answer:(id:string,value:string)=>{haptic();update(s=>answerAsk(s,id,value))},skip:(id:string)=>update(s=>skipAsk(s,id))};
}

// aiConsent is null while AI processing still needs the user's permission in Ask.
export function BallAsks({aiConsent,reduce,onNotice}:{aiConsent:string|null;reduce:boolean;onNotice:(text:string,done?:boolean)=>void}){
 const {state,update,saveAskProgress}=useStore(),{teen,progress,next,answer,skip,bonusPending,bonusFailed,retryBonus}=useBallAsks(onNotice);
 const [status,setStatus]=useState<'idle'|'forming'|'failed'>('idle'),[fresh,setFresh]=useState<Insight|null>(null),[deferredAt,setDeferredAt]=useState(-1),[attempt,setAttempt]=useState(0),[tapped,setTapped]=useState(false),[answersOpen,setAnswersOpen]=useState(false);
 const answered=progress.seen.length,mine=selfAnswers(state.facts,teen);
 // An insight is owed every 10 answers; it waits while answers are too few to read (after Forget everything) or the user defers it.
 const owed=insightDue(progress)&&mine.length>=3&&deferredAt!==answered;
 useEffect(()=>{
  if(!owed||fresh||aiConsent===null)return;
  let active=true;setStatus('forming');
  void requestInsight(state.facts,nextInsightKind(progress),state,aiConsent).then(async insight=>{
   if(!active)return;
   await saveAskProgress(s=>active?{...s,asks:{...asksOf(s),insights:[...asksOf(s).insights,insight]}}:s);
   if(active){setFresh(insight);setStatus('idle')}
  }).catch(()=>{if(active)setStatus('failed')});
  return()=>{active=false;setStatus('idle')};
 },[owed,progress.insights.length,fresh,aiConsent,attempt]);
 const untilInsight=insightEvery-answered%insightEvery,untilBonus=answersPerBonus-answered%answersPerBonus;
 function moment(){
  if(fresh)return <Enter key={fresh.at} kind="reveal" reduce={reduce}><View testID="ask-insight" style={styles.panel}><Surface kind="card" state="selected"><Txt style={[styles.label,{color:colors.gold}]}>{`${kindLabels[fresh.kind]} · free insight`}</Txt><Txt display accessibilityRole="header" style={{fontSize:30,lineHeight:34,marginTop:10}}>{fresh.title}</Txt><Txt accessibilityLiveRegion="polite" style={{marginTop:10}}>{fresh.text}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Reflection for fun, from your own answers.</Txt><Action testID="ask-keep-going" label="Keep going" onPress={()=>setFresh(null)}/></Surface></View></Enter>;
  if(!owed)return null;
  const later=<Action testID="ask-insight-later" label="Keep answering" quiet onPress={()=>{setDeferredAt(answered);setStatus('idle')}}/>;
  if(aiConsent===null)return <View style={styles.panel}><Surface kind="card"><Txt>Your insight is ready to form.</Txt><Txt style={styles.caption}>Allow AI processing in Ask to receive it.</Txt>{later}</Surface></View>;
  if(status==='failed')return <View style={styles.panel}><Surface kind="error"><Txt accessibilityLiveRegion="polite">The mist is too thick for your insight right now.</Txt><Action testID="ask-insight-retry" label="Try again" onPress={()=>setAttempt(n=>n+1)}/>{later}</Surface></View>;
  return <Enter kind="status" reduce={reduce}><View testID="ask-insight-forming" style={styles.panel}><Surface kind="card"><Txt display style={{fontFamily:fonts.italic,fontSize:26,lineHeight:30,textAlign:'center'}}>The Ball is reading your answers…</Txt><Txt style={[styles.caption,{textAlign:'center',marginTop:8}]}>A free insight every {insightEvery} answers.</Txt></Surface></View></Enter>;
 }
 const insight=moment();
 return <View testID="ball-asks">
  {answered?null:<Txt style={styles.muted}>One tap each, skip anything. The Ball uses a few of your answers to make your forecasts more personal.</Txt>}
  <View style={styles.panel}><Surface kind="card">
   <View style={styles.row}><Txt testID="ask-count" style={styles.label}>{`${answered} answered`}</Txt><View accessibilityLabel={`${insightEvery-untilInsight} of ${insightEvery} toward your next insight`} style={{flexDirection:'row',gap:4}}>{Array.from({length:insightEvery},(_,i)=><View key={i} style={{width:10,height:3,borderRadius:2,backgroundColor:i<insightEvery-untilInsight?colors.gold:'rgba(227,199,143,.25)'}}/>)}</View></View>
   <Txt style={[styles.caption,{marginTop:8}]}>{`Free insight in ${untilInsight} · ${bonusPending?'bonus reading pending':`bonus reading in ${untilBonus}`}`}</Txt>
  </Surface></View>
  {bonusPending&&bonusFailed?<View style={styles.panel}><Surface kind="error"><Txt accessibilityLiveRegion="polite">Your bonus reading could not be claimed. Try again when you’re connected.</Txt><Action testID="ask-bonus-retry" label="Claim bonus reading" onPress={retryBonus}/></Surface></View>:null}
  {insight??(next?<Enter key={next.id} kind="status" reduce={reduce}><View style={{marginTop:24}}>
   {tapped?<Txt testID="ask-reflection" style={[styles.caption,{color:colors.gold,textAlign:'center',marginBottom:12}]}>{reflection(answered)}</Txt>:null}
   <Txt style={[styles.label,{textAlign:'center'}]}>{areaLabels[next.area]}</Txt>
   <Txt testID="ask-question" display accessibilityRole="header" style={{fontSize:32,lineHeight:36,textAlign:'center',marginTop:10}}>{next.question}</Txt>
   <View accessibilityRole="radiogroup" style={{marginTop:14,flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}>{next.options.map((option,i)=><Pressable testID={`ask-option-${i}`} key={option} accessibilityRole="radio" aria-checked={false} accessibilityState={{checked:false}} onPress={()=>{setTapped(true);answer(next.id,option)}} style={{minHeight:52,paddingHorizontal:18,paddingVertical:12}}><Surface kind="chip"><Txt style={{fontSize:19,lineHeight:28,textAlign:'center'}}>{option}</Txt></Surface></Pressable>)}</View>
   <Pressable testID="ask-skip" accessibilityRole="button" onPress={()=>skip(next.id)} style={{minHeight:44,justifyContent:'center',alignItems:'center',marginTop:6}}><Txt style={{color:colors.ice}}>Skip</Txt></Pressable>
  </View></Enter>:<View style={styles.panel}><Surface kind="card"><Txt display style={{fontSize:26,lineHeight:30}}>You’ve answered every question the Ball has, for now.</Txt><Txt style={styles.caption}>Change any answer below whenever you change.</Txt></Surface></View>)}
  {progress.insights.length?<><Txt display style={[styles.title,{marginTop:32}]}>Your insights</Txt>{[...progress.insights].reverse().map(item=><View key={item.at} style={styles.panel}><Surface kind="card"><CardHeader title={item.title} label={kindLabels[item.kind]}/><Txt style={{marginTop:8}}>{item.text}</Txt></Surface></View>)}</>:null}
  {mine.length?<><Pressable testID="ask-answers" accessibilityRole="button" aria-expanded={answersOpen} accessibilityState={{expanded:answersOpen}} onPress={()=>setAnswersOpen(!answersOpen)} style={{minHeight:48,justifyContent:'center',marginTop:24}}><Txt style={{color:colors.ice}}>{`${answersOpen?'Hide':'Change or forget'} your answers (${mine.length}) ${answersOpen?'⌃':'⌄'}`}</Txt></Pressable>
   {answersOpen?mine.map(({key,question,answer:value})=><View key={key} style={styles.panel}><Surface kind="card"><Txt style={styles.caption}>{question}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{askFor(key)!.options.map(option=><Pressable key={option} accessibilityRole="radio" aria-checked={option===value} accessibilityState={{checked:option===value}} onPress={()=>update(s=>({...s,facts:{...s.facts,[key]:option}}))} style={{minHeight:44,paddingHorizontal:14,paddingVertical:10}}><Surface kind="chip" state={option===value?'selected':undefined}><Txt style={styles.chip}>{option}</Txt></Surface></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel={`Forget ${question}`} onPress={()=>update(s=>{const facts={...s.facts};delete facts[key];return {...s,facts}})} style={{minHeight:44,justifyContent:'center',marginTop:4}}><Txt style={{color:colors.muted}}>Forget</Txt></Pressable></Surface></View>):null}</>:null}
 </View>;
}
