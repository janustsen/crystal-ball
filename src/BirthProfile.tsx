import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Platform,Pressable,View,type TextInput} from 'react-native';
import {Input,Action,Txt,styles,colors} from './ui';
import {useStore} from './store';
import {formatCalendarDate} from './retention';
import {BirthdayInput} from './BirthdayInput';
import {ageGroup,updateBirthday} from './profile';
import {birthChart,findBirthPlaces,validBirthTime,type BirthPlace} from './birth-chart';

export function BirthProfile({onEditorChange}:{onEditorChange?:(editing:boolean)=>void}){
 const {state,update}=useStore(),[editing,setEditing]=useState(false),[chartOpen,setChartOpen]=useState(false),[birthday,setBirthday]=useState(state.birthday||''),[time,setTime]=useState(state.birthTime||''),[place,setPlace]=useState(''),[places,setPlaces]=useState<BirthPlace[]>([]),[selected,setSelected]=useState<BirthPlace>(),[notice,setNotice]=useState('');
 const [chartStep,setChartStep]=useState<'time'|'city'>('time');
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
 function backChart(){if(chartStep==='city'&&chartStatus!=='saved'){request.current?.abort();setChartStep('time');setChartStatus('idle')}else closeChart()}
 useEffect(()=>{if(!editing&&!chartOpen)return;const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(editing){setNotice('');setEditing(false)}else backChart();return true});return()=>listener.remove()},[editing,chartOpen,chartStep,chartStatus]);
 useEffect(()=>{if(!chartOpen||chartStatus==='saved')return;if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid=birth-details-heading]');heading?.setAttribute('tabindex','-1');heading?.focus();heading?.scrollIntoView({block:'start'})}else AccessibilityInfo.announceForAccessibility(chartStep==='time'?'Step 1 of 2: birth time':'Step 2 of 2: birth city')},[chartStep,chartOpen]);
 function nextCity(){if(!validBirthTime(time)){setChartStatus('time-error');timeInput.current?.focus();return}setChartStatus('idle');setChartStep('city')}
 function closeChart(){request.current?.abort();setChartOpen(false);setChartStatus('idle')}
 function forgetChart(){
  request.current?.abort();update(s=>({...s,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined}));setTime('');setPlace('');setSelected(undefined);setPlaces([]);setChartStatus('forgotten');setChartStep('time');
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
  <Txt style={[styles.caption,{marginBottom:12}]}>Used for your Sun sign and age-appropriate readings.</Txt>
  <BirthdayInput testID="profile-birthday" error={notice} value={birthday} onChange={setBirthday}/>
  <Action label="Save birthday" onPress={saveBirthday}/><Action testID="cancel-birthday" label="Cancel changes" quiet onPress={()=>{setNotice('');setEditing(false)}}/>
  {state.birthday?<><Pressable testID="remove-birthday-options" accessibilityRole="button" accessibilityState={{expanded:removal}} aria-expanded={removal} onPress={()=>setRemoval(!removal)} style={{minHeight:52,paddingVertical:16}}><Txt style={styles.caption}>Remove birthday {removal?'⌃':'⌄'}</Txt></Pressable>{removal?<><Txt style={styles.caption}>Your existing age eligibility stays. Birth chart details are removed.</Txt><Action label="Forget birthday" quiet onPress={()=>{update(s=>updateBirthday(s));setEditing(false);setNotice('Birthday removed.')}}/></>:null}</>:null}
 </View>;
 if(state.birthday&&chartOpen){
  const saved=chartStatus==='saved';
  const message=chartStatus==='no-results'?'No matching city. Check the spelling or try a nearby town for an approximate chart.':chartStatus==='search-error'?'City search is unavailable. Try again.':chartStatus==='calculation-error'?'The chart could not be calculated. Try again.':chartStatus==='forgotten'?'Birth time and place forgotten. Your birthday is kept.':'';
  return <View>
   <Pressable testID="close-birth-details" accessibilityRole="button" accessibilityLabel={chartStep==='city'&&!saved?'Back to birth time':'Back to You'} onPress={backChart} style={{alignSelf:'flex-start',minHeight:44,minWidth:44,justifyContent:'center',marginBottom:8}}><Txt style={{color:colors.ice}}>{chartStep==='city'&&!saved?'‹ Birth time':'‹ You'}</Txt></Pressable>
   <Txt testID="birth-details-heading" accessibilityRole="header" display style={{fontSize:22,lineHeight:28}}>{saved?'Your Moon and rising':chartStep==='time'?'Your birth time':'Your birth city'}</Txt>
   {saved?<>
    <Txt accessibilityLiveRegion="polite" style={[styles.caption,{color:colors.gold,marginTop:16}]}>Calculated and saved on this device.</Txt>
    <Txt display style={{fontSize:24,lineHeight:32,marginVertical:16}}>{state.moonSign&&state.moonSign[0].toUpperCase()+state.moonSign.slice(1)} Moon · {state.risingSign&&state.risingSign[0].toUpperCase()+state.risingSign.slice(1)} rising</Txt>
    <Txt style={[styles.caption,{marginTop:12}]}>{state.birthPlace} · {state.birthTime}</Txt>
    <Action label="Done" onPress={closeChart}/>
    <Action label="Edit birth details" quiet onPress={()=>{setChartStep('time');setChartStatus('idle');setTime(state.birthTime||'');setPlace('');setSelected(undefined);setPlaces([])}}/>
    <Action label="Forget birth time and place" quiet onPress={forgetChart}/>
   </>:<>
    <Txt style={[styles.caption,{marginTop:8,marginBottom:12}]}>Step {chartStep==='time'?'1':'2'} of 2 · optional</Txt>
    {state.birthPlace?<Txt style={[styles.caption,{marginBottom:16}]}>Editing details. Your saved chart stays until you calculate and save.</Txt>:null}
    {chartStatus==='forgotten'?<Txt accessibilityRole="alert" style={{marginBottom:16}}>{message}</Txt>:null}
    {chartStep==='time'?<>
    <Txt style={styles.caption}>Birth time · local, 24-hour clock</Txt>
    <Input ref={timeInput} testID="birth-time" accessibilityLabel="Birth time HH:MM" aria-invalid={chartStatus==='time-error'} aria-describedby="birth-time-help" placeholder="HH:MM" placeholderTextColor={colors.muted} value={time} onChangeText={value=>{setTime(value);setChartStatus(current=>current==='searching'?current:'idle')}} style={styles.input} maxLength={5}/>
    <Txt nativeID="birth-time-help" accessibilityRole={chartStatus==='time-error'?'alert':undefined} style={[styles.caption,{color:chartStatus==='time-error'?colors.gold:colors.muted,marginBottom:16}]}>{chartStatus==='time-error'?'Enter a time from 00:00 to 23:59.':'14:30 is 2:30 pm. Use the local time where you were born.'}</Txt>
    <Action testID="continue-to-birth-city" label="Continue to city" onPress={nextCity}/><Action testID="unknown-birth-time" label="I don’t know my birth time" quiet onPress={closeChart}/>
    </>:<>
    {selected?<>
     <Txt style={styles.caption}>Selected birth city</Txt><Txt>{selected.name}</Txt>
     <Action label="Change birth city" quiet onPress={()=>{setSelected(undefined);setPlaces([]);setChartStatus('idle');if(Platform.OS==='web')requestAnimationFrame(()=>cityInput.current?.focus())}}/>
    </>:<>
     <Txt style={styles.caption}>Birth city</Txt>
     <Input ref={cityInput} accessibilityLabel="Birth city" placeholder="City" placeholderTextColor={colors.muted} value={place} onChangeText={value=>{request.current?.abort();setChartStatus('idle');setPlace(value);setPlaces([])}} style={styles.input} maxLength={100}/>
     {chartStatus==='no-results'||chartStatus==='search-error'?<Txt accessibilityRole="alert" style={{marginVertical:8}}>{message}</Txt>:null}
     <Action testID="find-birth-city" label={busy?'Finding your city…':chartStatus==='search-error'?'Retry city search':'Find birth city'} disabled={busy||place.trim().length<2} onPress={search}/>
     {places.length?<Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:20}]}>Select your birth city</Txt>:null}
     {places.map(p=><Action key={`${p.latitude},${p.longitude}`} label={p.name} quiet onPress={()=>{setSelected(p);setPlaces([]);setChartStatus('idle')}}/>)}
    </>}
    {!message&&chartStatus!=='time-error'?<Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{busy?'Finding matching cities…':selected?(validBirthTime(time)?'Ready to calculate and save.':'Add your local birth time to continue.'):places.length?'':'Find and select your birth city to continue.'}</Txt>:null}
    {chartStatus==='calculation-error'?<Txt accessibilityRole="alert" style={{marginTop:12}}>{message}</Txt>:null}
    {selected?<Action testID="reveal-moon-and-rising" label="Calculate and save" disabled={!time} onPress={calculate}/>:null}
    <Action testID="skip-birth-city" label="Skip birth details" quiet onPress={closeChart}/>
    <Txt style={[styles.caption,{marginTop:16}]}>Only the city name is sent to Open-Meteo / GeoNames.</Txt>
    </>}
    {state.birthPlace?<Action label="Forget birth time and place" quiet onPress={forgetChart}/>:null}
   </>}
  </View>;
 }
 return <View style={[styles.panel,state.largeText&&{paddingTop:8,marginTop:0}]}>
  <Txt display style={[styles.title,{fontSize:22,lineHeight:28}]}>Your sky</Txt>
  <Txt>{state.sunSign?`${state.sunSign[0].toUpperCase()+state.sunSign.slice(1)} Sun`:'Your Sun sign is a mystery'}</Txt>
  <Txt style={styles.caption}>{!state.birthday?'Age not shared · readings for ages 13–17':state.ageBand==='teen'?'Teen · ages 13–17':state.ageBand==='adult'?'18 and up':'Age not shared · readings for ages 13–17'}</Txt>
  {state.birthday?<Txt style={styles.caption}>Birthday · {formatCalendarDate(state.birthday)}</Txt>:null}
  <Action label="Edit birthday" quiet onPress={()=>{setBirthday(state.birthday||'');setNotice('');setRemoval(false);setEditing(true)}}/>

  {state.moonSign?<Txt>{state.moonSign&&state.moonSign[0].toUpperCase()+state.moonSign.slice(1)} Moon · {state.risingSign&&state.risingSign[0].toUpperCase()+state.risingSign.slice(1)} rising</Txt>:null}
  {state.birthday?<Action label="Add birth time and place" quiet onPress={()=>{setNotice('');setChartStep('time');setChartStatus(state.birthPlace&&state.moonSign?'saved':'idle');setChartOpen(true)}}/>:null}

  {notice?<Txt accessibilityRole="alert">{notice}</Txt>:null}
 </View>;
}
