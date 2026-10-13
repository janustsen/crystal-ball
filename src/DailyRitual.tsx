import React,{useEffect,useState} from 'react';
import {Platform,Pressable,View} from 'react-native';
import Svg,{Circle,Polyline} from 'react-native-svg';
import {Action,CardHeader,colors,fonts,styles,Toggle,Txt} from './ui';
import {Surface} from './Surface';
import {Enter} from './Enter';
import {constellation,dayProgress,morningTimes,type Planned,type NotifyPrefs,type Ritual} from './ritual';
import {previewNotifications,testNotification} from './notify';
import type {AccountState} from './types';

// Seven stars of the current constellation; lit ones glow gold. Static, so reduced motion needs nothing extra.
export function Constellation({stars,lit,width=200}:{stars:[number,number][];lit:number;width?:number}){
 return <View aria-hidden pointerEvents="none"><Svg width={width} height={width*.6} viewBox="0 0 100 60">
  <Polyline points={stars.map(([x,y])=>`${x},${y}`).join(' ')} fill="none" stroke="rgba(227,199,143,.28)" strokeWidth={.6}/>
  {stars.map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={i<lit?2.6:1.6} fill={i<lit?colors.gold:'rgba(244,235,221,.35)'}/>)}
 </Svg></View>;
}

const time12=(time:string)=>{const h=Number(time.slice(0,2));return `${h%12||12}:${time.slice(3)} ${h<12?'am':'pm'}`};
function TimeChips({value,onChange}:{value:string;onChange:(time:string)=>void}){
 return <View accessibilityRole="radiogroup" accessibilityLabel="Morning notification time" style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
  {morningTimes.map(time=><Pressable key={time} testID={`notify-time-${time}`} accessibilityRole="radio" aria-checked={value===time} accessibilityState={{checked:value===time}} onPress={()=>onChange(time)} style={{minHeight:44,paddingHorizontal:16,justifyContent:'center'}}><Surface kind="chip" state={value===time?'selected':undefined}><Txt style={styles.chip}>{time12(time)}</Txt></Surface></Pressable>)}
 </View>;
}

// Home's daily strip: the day's steps, then the constellation today's star joins.
export function TodayCard({ritual,day,reduce,onStep,hint}:{ritual:Ritual;day:string;reduce:boolean;onStep:(step:string)=>void;hint?:(step:string)=>string|undefined}){
 const progress=dayProgress(ritual,day),sky=constellation(ritual.stars.length),star=ritual.stars.includes(day);
 return <View testID="today-card" style={{padding:18,gap:10}}><Surface kind="card">
  <CardHeader title="Today" label={`${progress.lit} of ${progress.steps.length}`}/>
  {progress.steps.map(step=><Pressable key={step.id} testID={`today-${step.id}`} accessibilityRole="button" accessibilityState={{checked:step.done}} accessibilityLabel={`${step.label}${step.done?', done':''}`} disabled={step.done} onPress={()=>onStep(step.id)} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:12}}>
   <Txt aria-hidden style={{width:18,textAlign:'center',color:step.done?colors.gold:colors.inactive,fontSize:16}}>{step.done?'✦':'✧'}</Txt>
   <View style={{flex:1}}><Txt style={{color:step.done?colors.muted:colors.ivory,textDecorationLine:step.done?'line-through':'none'}}>{step.label}{step.target>1?` · ${step.count}/${step.target}`:''}</Txt>{!step.done&&hint?.(step.id)?<Txt style={styles.caption}>{hint(step.id)}</Txt>:null}</View>
   {!step.done?<Txt aria-hidden style={{color:colors.gold}}>›</Txt>:null}
  </Pressable>)}
  <View style={{alignItems:'center',marginTop:4}}>
   <Constellation stars={sky.stars} lit={sky.lit} width={170}/>
   {star?<Enter kind="check" reduce={reduce}><Txt accessibilityLiveRegion="polite" style={[styles.caption,{textAlign:'center',color:colors.gold}]}>{`Today’s star is in ${sky.lit?sky.name:constellation(ritual.stars.length-1).name}.`}</Txt></Enter>:<Txt style={[styles.caption,{textAlign:'center'}]}>{`Finish today to add a star to ${sky.name} · ${sky.lit} of 7`}</Txt>}
   {sky.collected?<Txt style={[styles.label,{marginTop:6}]}>{`${sky.collected} constellation${sky.collected===1?'':'s'} collected`}</Txt>:null}
  </View>
 </Surface></View>;
}

// You's record of the sky: every completed constellation, and nothing ever resets.
export function YourSky({ritual}:{ritual:Ritual}){
 const sky=constellation(ritual.stars.length);
 return <View testID="your-sky" style={styles.panel}><Surface kind="card">
  <CardHeader title="Your sky" label={`${ritual.stars.length} star${ritual.stars.length===1?'':'s'}`}/>
  <View style={{alignItems:'center'}}><Constellation stars={sky.stars} lit={sky.lit} width={240}/></View>
  <Txt style={[styles.caption,{textAlign:'center'}]}>{`${sky.name} · ${sky.lit} of 7`}</Txt>
  {sky.names.length?<Txt style={[styles.caption,{marginTop:8,color:colors.gold}]}>{`Collected: ${sky.names.join(', ')}`}</Txt>:null}
 </Surface></View>;
}

// The notification opt-in, right after a forecast (and once more on day three). Only "Yes" asks iOS for permission.
export function NotifyOffer({onAnswer}:{onAnswer:(time:string|null)=>void}){
 const [time,setTime]=useState(morningTimes[0]);
 return <View testID="notify-offer" style={styles.panel}><Surface kind="card">
  <CardHeader title="Want your insight each morning?" label="Optional"/>
  <Txt style={[styles.caption,{marginTop:6}]}>Your insight at the time you pick, and a gentle evening nudge.</Txt>
  <TimeChips value={time} onChange={setTime}/>
  <Action testID="notify-yes" label="Yes, notify me" onPress={()=>onAnswer(time)}/>
  <Action testID="notify-not-now" label="Not now" quiet onPress={()=>onAnswer(null)}/>
 </Surface></View>;
}

export function NotifySettings({prefs,onChange}:{prefs:NotifyPrefs;onChange:(prefs:NotifyPrefs)=>void}){
 return <View testID="notify-settings" style={styles.panel}><Surface kind="card">
  <View style={styles.row}><Txt style={{flexShrink:1}}>Morning insight and evening nudge</Txt><Toggle testID="notify-toggle" accessibilityLabel="Morning insight and evening nudge notifications" value={prefs.daily} onValueChange={daily=>onChange({...prefs,daily})}/></View>
  {Platform.OS==='web'?<Txt style={styles.caption}>Notifications need the iOS app.</Txt>:null}
  {prefs.daily?<TimeChips value={prefs.time} onChange={time=>onChange({...prefs,time})}/>:null}
 </Surface></View>;
}

// Private, on-device usage counts. Nothing here is sent anywhere.
export function RitualDebug({state,ritual,onNotice}:{state:AccountState;ritual:Ritual;onNotice:(text:string)=>void}){
 const [plan,setPlan]=useState<Planned[]>([]),offered=ritual.counts.optInShown??0;
 useEffect(()=>{let active=true;void previewNotifications(state).then(next=>{if(active)setPlan(next)}).catch(()=>{if(active)setPlan([])});return()=>{active=false}},[state]);
 const rows:[string,string|number][]=[['Days opened',ritual.opened.length],['Finished days (stars)',ritual.stars.length],['App opens',ritual.counts.appOpens??0],['Opt-in shown',offered],['Opt-in yes',ritual.counts.optInYes??0],['Opt-in not now',ritual.counts.optInNo??0],['Permission denied',ritual.counts.optInDenied??0],['Morning taps',ritual.counts['tap:morning']??0],['Evening taps',ritual.counts['tap:evening']??0],['Today steps tapped',ritual.counts.todayTap??0],['Readings',ritual.counts.readings??0],['Check-ins',ritual.counts.checkIns??0],...Object.entries(ritual.counts).filter(([key])=>!['appOpens','optInShown','optInYes','optInNo','optInDenied','tap:morning','tap:evening','todayTap','readings','checkIns','fullDays'].includes(key)) as [string,number][]];
 return <View testID="ritual-debug" style={styles.panel}><Surface kind="card">
  <CardHeader title="Ritual counts" label="This device only"/>
  {rows.map(([name,value])=><View key={name} style={[styles.row,{marginTop:6}]}><Txt style={styles.caption}>{name}</Txt><Txt style={{fontFamily:fonts.sansMedium,fontSize:13}}>{String(value)}</Txt></View>)}
  <Txt style={[styles.label,{marginTop:16}]}>{`Next notification plan · ${plan.length}`}</Txt>
  {plan.slice(0,8).map(p=><Txt key={p.id} style={styles.caption}>{`${p.at.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · ${p.body}`}</Txt>)}
  {Platform.OS!=='web'?<Action testID="test-notification" label="Send a test notification next minute" quiet onPress={()=>void testNotification(state).then(ok=>onNotice(ok?'Test notification scheduled. Lock the phone or leave the app to see it.':'No test scheduled: check permission, quiet hours, or today’s notification limit.')).catch(()=>onNotice('Test notification could not be scheduled.'))}/>:null}
 </Surface></View>;
}
