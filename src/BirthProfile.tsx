import {useEffect,useRef,useState} from 'react';
import {Platform,Pressable,View} from 'react-native';
import {Input,Action,Txt,styles,colors} from './ui';
import {useStore} from './store';
import {ageGroup,updateBirthday} from './profile';
import {birthChart,findBirthPlaces,type BirthPlace} from './birth-chart';

export function BirthProfile({onEditorChange}:{onEditorChange?:(editing:boolean)=>void}){
 const {state,update}=useStore(),[editing,setEditing]=useState(false),[chartOpen,setChartOpen]=useState(false),[birthday,setBirthday]=useState(state.birthday||''),[time,setTime]=useState(state.birthTime||''),[place,setPlace]=useState(''),[places,setPlaces]=useState<BirthPlace[]>([]),[selected,setSelected]=useState<BirthPlace>(),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const wasEditing=useRef(false),[removal,setRemoval]=useState(false);
 useEffect(()=>{onEditorChange?.(editing);return()=>onEditorChange?.(false)},[editing,onEditorChange]);
 useEffect(()=>{if(Platform.OS!=='web'||!editing&&!wasEditing.current)return;wasEditing.current=editing;const target=document.querySelector<HTMLElement>(editing?'[data-testid=birthday-editor-heading]':'[data-testid=edit-birthday]');if(editing)target?.setAttribute('tabindex','-1');target?.focus()},[editing]);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function search(){
  request.current?.abort();const abort=new AbortController();request.current=abort;setBusy(true);setNotice('');setSelected(undefined);setPlaces([]);
  try{const matches=await findBirthPlaces(place.trim(),abort.signal);if(!abort.signal.aborted){setPlaces(matches);if(!matches.length)setNotice('No matching city. Try a nearby town.');}}catch{if(!abort.signal.aborted)setNotice('City search is unavailable. Try again later.');}finally{if(!abort.signal.aborted)setBusy(false);}
 }
 function saveBirthday(){
  if(ageGroup(birthday)==='under13'){update(s=>({...s,onboardingBlocked:true,onboardingDone:false}));return;}
  try{const next=updateBirthday(state,birthday.trim()||undefined);update(()=>next);setEditing(false);setNotice('Birthday saved.');}catch(e){setNotice(e instanceof Error?e.message:'Check your birthday.');}
 }
 if(editing)return <View>
  <Txt testID="birthday-editor-heading" accessibilityRole="header" display style={{fontSize:28,lineHeight:34,marginBottom:16}}>Edit birthday</Txt>
  <Txt style={[styles.caption,{marginBottom:24}]}>Used for your Sun sign and age-appropriate readings.</Txt>
  <Txt style={styles.caption}>Birthday · year-month-day</Txt>
  <Input accessibilityLabel="Birthday YYYY-MM-DD" placeholder="1995-06-15" placeholderTextColor={colors.muted} value={birthday} onChangeText={setBirthday} style={styles.input} maxLength={10}/>
  <Txt style={styles.caption}>For example, 1995-06-15.</Txt>
  {notice?<Txt accessibilityRole="alert" style={{marginTop:12}}>{notice}</Txt>:null}
  <Action label="Save birthday" onPress={saveBirthday}/><Action testID="cancel-birthday" label="Cancel changes" quiet onPress={()=>{setNotice('');setEditing(false)}}/>
  {state.birthday?<><Pressable testID="remove-birthday-options" accessibilityRole="button" accessibilityState={{expanded:removal}} aria-expanded={removal} onPress={()=>setRemoval(!removal)} style={{minHeight:52,paddingVertical:16}}><Txt style={styles.caption}>Remove birthday {removal?'−':'+'}</Txt></Pressable>{removal?<><Txt style={styles.caption}>Your existing age eligibility stays. Birth chart details are removed.</Txt><Action label="Forget birthday" quiet onPress={()=>{update(s=>updateBirthday(s));setEditing(false);setNotice('Birthday removed.')}}/></>:null}</>:null}
 </View>;
 return <View style={styles.panel}>
  <Txt display style={styles.title}>Your sky</Txt>
  <Txt>{state.sunSign?`${state.sunSign} Sun`:'Your Sun sign is a mystery'}</Txt>
  <Txt style={styles.caption}>{!state.birthday?'Age not shared · teen-safe defaults':state.ageBand==='teen'?'Teen · ages 13–17':state.ageBand==='adult'?'18 and up':'Age not shared · teen-safe defaults'}</Txt>
  {state.birthday?<Txt style={styles.caption}>Birthday · {state.birthday}</Txt>:null}
  <Action label="Edit birthday" quiet onPress={()=>{setBirthday(state.birthday||'');setNotice('');setRemoval(false);setEditing(true)}}/>

  {state.moonSign?<Txt>{state.moonSign} Moon · {state.risingSign} rising</Txt>:null}
  {state.birthday?<Action label={chartOpen?'Close birth details':'Add birth time and place'} quiet onPress={()=>setChartOpen(!chartOpen)}/>:null}
  {state.birthday&&chartOpen?<>
   <Txt style={[styles.caption,{marginTop:16}]}>Optional · your Moon and rising</Txt>
   {state.birthPlace?<Txt style={styles.caption}>{state.birthPlace} · {state.birthTime}</Txt>:null}
   <Txt style={styles.caption}>Birth time · local time, HH:MM</Txt>
   <Input accessibilityLabel="Birth time HH:MM" placeholder="14:30" placeholderTextColor={colors.muted} value={time} onChangeText={setTime} style={styles.input} maxLength={5}/>
   <Txt style={styles.caption}>Birth city</Txt><Txt style={[styles.caption,{marginTop:6}]}>Find your city, then select a result below.</Txt>
   <Input accessibilityLabel="Birth city" placeholder="City, country" placeholderTextColor={colors.muted} value={place} onChangeText={value=>{request.current?.abort();setBusy(false);setPlace(value);setSelected(undefined);setPlaces([])}} style={styles.input} maxLength={100}/>
   <Action label={busy?'Finding your city…':'Find birth city'} quiet disabled={busy||place.trim().length<2} onPress={search}/>
   {places.map(p=><Action key={`${p.latitude},${p.longitude}`} label={p.name} quiet={selected!==p} onPress={()=>setSelected(p)}/>)}
   <Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{!selected?'Select a city result to continue.':!time?'Add your local birth time to continue.':`Selected: ${selected.name}. Ready to calculate on this device.`}</Txt>
   <Action label="Reveal Moon and rising" disabled={!selected||!time} onPress={()=>{try{if(!selected||!state.birthday)return;const chart=birthChart(state.birthday,time,selected.latitude,selected.longitude);update(s=>({...s,...chart,birthTime:time,birthPlace:selected.name}));setNotice('Calculated on this device.');}catch{setNotice('Check your time and place, then try again.');}}}/>
   {state.birthPlace?<Action label="Forget birth time and place" quiet onPress={()=>{update(s=>({...s,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined}));setTime('');setPlace('');setSelected(undefined);setPlaces([])}}/>:null}
   <Txt style={styles.caption}>City search: Open-Meteo / GeoNames. Only the city name is sent.</Txt>
  </>:null}
  {notice?<Txt accessibilityRole="alert">{notice}</Txt>:null}
 </View>;
}
