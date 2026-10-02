import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Platform,Pressable,View,type TextInput} from 'react-native';
import {Input,Action,Txt,styles,colors} from './ui';
import {useStore} from './store';
import {formatCalendarDate} from './retention';
import {BirthdayInput} from './BirthdayInput';
import {ageGroup,updateBirthday} from './profile';
import {birthChart,findBirthPlaces,validBirthTime,type BirthPlace} from './birth-chart';

export function BirthProfile({onEditorChange}:{onEditorChange?:(editing:boolean)=>void}){
 const {state,update}=useStore(),[editing,setEditing]=useState(false),[chartOpen,setChartOpen]=useState(false),[birthday,setBirthday]=useState(state.birthday||''),[time,setTime]=useState(state.birthTime||''),[place,setPlace]=useState(''),[places,setPlaces]=useState<BirthPlace[]>([]),[selected,setSelected]=useState<BirthPlace>(),[notice,setNotice]=useState('');
 const [chartStatus,setChartStatus]=useState<'idle'|'searching'|'no-results'|'search-error'|'time-error'|'calculation-error'|'saved'|'forgotten'>('idle');
 const timeInput=useRef<TextInput>(null),cityInput=useRef<TextInput>(null),busy=chartStatus==='searching';
 const wasChartOpen=useRef(false);
 const wasEditing=useRef(false),[removal,setRemoval]=useState(false);
 useEffect(()=>{onEditorChange?.(editing||chartOpen);return()=>onEditorChange?.(false)},[editing,chartOpen,onEditorChange]);
 useEffect(()=>{if(Platform.OS!=='web'||!editing&&!wasEditing.current)return;wasEditing.current=editing;const target=document.querySelector<HTMLElement>(editing?'[data-testid=birthday-editor-heading]':'[data-testid=edit-birthday]');if(editing)target?.setAttribute('tabindex','-1');target?.focus()},[editing]);
 useEffect(()=>{if(Platform.OS!=='web'||!chartOpen&&!wasChartOpen.current)return;wasChartOpen.current=chartOpen;const target=document.querySelector<HTMLElement>(chartOpen?'[data-testid=birth-details-heading]':'[data-testid=add-birth-time-and-place]');if(chartOpen)target?.setAttribute('tabindex','-1');target?.focus()},[chartOpen]);
 useEffect(()=>{if(!chartOpen||!['saved','forgotten'].includes(chartStatus))return;if(Platform.OS==='web'){const target=document.querySelector<HTMLElement>('[data-testid=birth-details-heading]');target?.setAttribute('tabindex','-1');target?.focus();target?.scrollIntoView({block:'start'});}else AccessibilityInfo.announceForAccessibility(chartStatus==='saved'?'Birth chart saved.':'Birth time and place forgotten. Your birthday is kept.')},[chartStatus,chartOpen]);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function search(){
  request.current?.abort();const abort=new AbortController();request.current=abort;setChartStatus('searching');setSelected(undefined);setPlaces([]);
  try{const matches=await findBirthPlaces(place.trim(),abort.signal);if(!abort.signal.aborted){setPlaces(matches);setChartStatus(matches.length?'idle':'no-results');}}catch{if(!abort.signal.aborted)setChartStatus('search-error');}
 }
 function closeChart(){request.current?.abort();setChartOpen(false);setChartStatus('idle')}
 function forgetChart(){
  request.current?.abort();update(s=>({...s,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined}));setTime('');setPlace('');setSelected(undefined);setPlaces([]);setChartStatus('forgotten');
 }
 function calculate(){
  if(!selected||!state.birthday)return;
  if(!validBirthTime(time)){setChartStatus('time-error');timeInput.current?.focus();return;}
  try{const chart=birthChart(state.birthday,time,selected.latitude,selected.longitude);update(s=>({...s,...chart,birthTime:time,birthPlace:selected.name}));setChartStatus('saved');}catch{setChartStatus('calculation-error')}
 }
 function saveBirthday(){
  if(ageGroup(birthday)==='under13'){update(s=>({...s,onboardingBlocked:true,onboardingDone:false}));return;}
  try{const next=updateBirthday(state,birthday.trim()||undefined);update(()=>next);setEditing(false);setNotice('Birthday saved.');}catch(e){setNotice(e instanceof Error?e.message:'Check your birthday.');}
 }
 if(editing)return <View>
  <Txt testID="birthday-editor-heading" accessibilityRole="header" display style={{fontSize:28,lineHeight:34,marginBottom:16}}>Edit birthday</Txt>
  <Txt style={[styles.caption,{marginBottom:24}]}>Used for your Sun sign and age-appropriate readings.</Txt>
  <BirthdayInput value={birthday} onChange={setBirthday}/>
  {notice?<Txt accessibilityRole="alert" style={{marginTop:12}}>{notice}</Txt>:null}
  <Action label="Save birthday" onPress={saveBirthday}/><Action testID="cancel-birthday" label="Cancel changes" quiet onPress={()=>{setNotice('');setEditing(false)}}/>
  {state.birthday?<><Pressable testID="remove-birthday-options" accessibilityRole="button" accessibilityState={{expanded:removal}} aria-expanded={removal} onPress={()=>setRemoval(!removal)} style={{minHeight:52,paddingVertical:16}}><Txt style={styles.caption}>Remove birthday {removal?'−':'+'}</Txt></Pressable>{removal?<><Txt style={styles.caption}>Your existing age eligibility stays. Birth chart details are removed.</Txt><Action label="Forget birthday" quiet onPress={()=>{update(s=>updateBirthday(s));setEditing(false);setNotice('Birthday removed.')}}/></>:null}</>:null}
 </View>;
 if(state.birthday&&chartOpen){
  const saved=chartStatus==='saved';
  const message=chartStatus==='no-results'?'No matching city. Try a nearby town.':chartStatus==='search-error'?'City search is unavailable. Try again.':chartStatus==='calculation-error'?'The chart could not be calculated. Try again.':chartStatus==='forgotten'?'Birth time and place forgotten. Your birthday is kept.':'';
  return <View>
   <Pressable testID="close-birth-details" accessibilityRole="button" accessibilityLabel="Close birth details" onPress={closeChart} style={{alignSelf:'flex-end',minHeight:44,minWidth:44,justifyContent:'center',marginBottom:8}}><Txt style={{color:colors.ice}}>Close</Txt></Pressable>
   <Txt testID="birth-details-heading" accessibilityRole="header" display>{saved?'Your Moon and rising':'Birth details'}</Txt>
   {saved?<>
    <Txt accessibilityLiveRegion="polite" style={[styles.caption,{color:colors.gold,marginTop:16}]}>Calculated and saved on this device.</Txt>
    <Txt display style={{fontSize:24,lineHeight:32,marginVertical:16}}>{state.moonSign} Moon · {state.risingSign} rising</Txt>
    <Txt style={styles.caption}>{state.birthPlace} · {state.birthTime}</Txt>
    <Action label="Done" onPress={closeChart}/>
    <Action label="Edit birth details" quiet onPress={()=>{setChartStatus('idle');setTime(state.birthTime||'');setPlace('');setSelected(undefined);setPlaces([])}}/>
    <Action label="Forget birth time and place" quiet onPress={forgetChart}/>
   </>:<>
    <Txt style={[styles.caption,{marginTop:12,marginBottom:20}]}>Optional · your Moon and rising signs.</Txt>
    {state.birthPlace?<Txt style={[styles.caption,{marginBottom:16}]}>Editing details. Your saved chart stays until you calculate and save.</Txt>:null}
    {message?<Txt accessibilityRole="alert" style={{marginBottom:16}}>{message}</Txt>:null}
    <Txt style={styles.caption}>Birth time · local, 24-hour clock</Txt>
    <Input ref={timeInput} testID="birth-time" accessibilityLabel="Birth time HH:MM" aria-invalid={chartStatus==='time-error'} aria-describedby="birth-time-help" placeholder="14:30" placeholderTextColor={colors.muted} value={time} onChangeText={value=>{setTime(value);setChartStatus(current=>current==='searching'?current:'idle')}} style={styles.input} maxLength={5}/>
    <Txt nativeID="birth-time-help" accessibilityRole={chartStatus==='time-error'?'alert':undefined} style={[styles.caption,{color:chartStatus==='time-error'?colors.gold:colors.muted,marginBottom:16}]}>{chartStatus==='time-error'?'Enter a time from 00:00 to 23:59.':'For example, 14:30 is 2:30 pm.'}</Txt>
    {selected?<>
     <Txt style={styles.caption}>Selected birth city</Txt><Txt>{selected.name}</Txt>
     <Action label="Change birth city" quiet onPress={()=>{setSelected(undefined);setPlaces([]);setChartStatus('idle');if(Platform.OS==='web')requestAnimationFrame(()=>cityInput.current?.focus())}}/>
    </>:<>
     <Txt style={styles.caption}>Birth city</Txt>
     <Input ref={cityInput} accessibilityLabel="Birth city" placeholder="City, country" placeholderTextColor={colors.muted} value={place} onChangeText={value=>{request.current?.abort();setChartStatus('idle');setPlace(value);setPlaces([])}} style={styles.input} maxLength={100}/>
     <Action testID="find-birth-city" label={busy?'Finding your city…':chartStatus==='search-error'?'Retry city search':'Find birth city'} quiet disabled={busy||place.trim().length<2} onPress={search}/>
     {places.map(p=><Action key={`${p.latitude},${p.longitude}`} label={p.name} quiet onPress={()=>{setSelected(p);setPlaces([]);setChartStatus('idle')}}/>)}
    </>}
    {!message&&chartStatus!=='time-error'?<Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{busy?'Finding matching cities…':selected?(validBirthTime(time)?'Ready to calculate and save.':'Add your local birth time to continue.'):places.length?'Select your city from the results above.':'Find and select your birth city to continue.'}</Txt>:null}
    <Action testID="reveal-moon-and-rising" label="Calculate and save" disabled={!selected||!time} onPress={calculate}/>
    {state.birthPlace?<Action label="Forget birth time and place" quiet onPress={forgetChart}/>:null}
    <Txt style={[styles.caption,{marginTop:16}]}>City search: Open-Meteo / GeoNames. Only the city name is sent.</Txt>
   </>}
  </View>;
 }
 return <View style={styles.panel}>
  <Txt display style={styles.title}>Your sky</Txt>
  <Txt>{state.sunSign?`${state.sunSign[0].toUpperCase()+state.sunSign.slice(1)} Sun`:'Your Sun sign is a mystery'}</Txt>
  <Txt style={styles.caption}>{!state.birthday?'Age not shared · teen-safe defaults':state.ageBand==='teen'?'Teen · ages 13–17':state.ageBand==='adult'?'18 and up':'Age not shared · teen-safe defaults'}</Txt>
  {state.birthday?<Txt style={styles.caption}>Birthday · {formatCalendarDate(state.birthday)}</Txt>:null}
  <Action label="Edit birthday" quiet onPress={()=>{setBirthday(state.birthday||'');setNotice('');setRemoval(false);setEditing(true)}}/>

  {state.moonSign?<Txt>{state.moonSign} Moon · {state.risingSign} rising</Txt>:null}
  {state.birthday?<Action label="Add birth time and place" quiet onPress={()=>{setNotice('');setChartStatus(state.birthPlace&&state.moonSign?'saved':'idle');setChartOpen(true)}}/>:null}

  {notice?<Txt accessibilityRole="alert">{notice}</Txt>:null}
 </View>;
}
