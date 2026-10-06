import {useEffect,useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {Action,Txt,styles,colors} from './ui';
import {useStore} from './store';
import {ageGroup,updateBirthday} from './profile';
import {birthChart,findBirthPlaces,type BirthPlace} from './birth-chart';
import {requestChartWeather} from './api';
import {localDay} from './retention';

// aiConsent is null while AI processing still needs the user's permission in Ask.
export function BirthProfile({aiConsent,onUpgrade}:{aiConsent:string|null;onUpgrade:()=>void}){
 const {state,update}=useStore(),[editing,setEditing]=useState(false),[chartOpen,setChartOpen]=useState(false),[birthday,setBirthday]=useState(state.birthday||''),[time,setTime]=useState(state.birthTime||''),[place,setPlace]=useState(''),[places,setPlaces]=useState<BirthPlace[]>([]),[selected,setSelected]=useState<BirthPlace>(),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[weatherBusy,setWeatherBusy]=useState(false);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function search(){
  request.current?.abort();const abort=new AbortController();request.current=abort;setBusy(true);setNotice('');setSelected(undefined);setPlaces([]);
  try{const matches=await findBirthPlaces(place.trim(),abort.signal);if(!abort.signal.aborted){setPlaces(matches);if(!matches.length)setNotice('No matching city. Try a nearby town.');}}catch{if(!abort.signal.aborted)setNotice('City search is unavailable. Try again later.');}finally{if(!abort.signal.aborted)setBusy(false);}
 }
 const month=localDay().slice(0,7),weather=state.chartWeather?.month===month?state.chartWeather.text:null;
 // ponytail: one chart weather per month is kept on this device, like the daily omen; move the claim server-side if requests are abused.
 async function readWeather(){
  if(aiConsent===null||weatherBusy)return;setWeatherBusy(true);setNotice('');
  try{const text=await requestChartWeather(state,aiConsent);update(s=>s.moonSign&&s.birthday===state.birthday&&s.moonSign===state.moonSign&&s.risingSign===state.risingSign?{...s,chartWeather:{month,text}}:s);}catch(e){setNotice(e instanceof Error?e.message:'Chart weather is unavailable. Please try again later.');}finally{setWeatherBusy(false);}
 }
 function saveBirthday(){
  if(ageGroup(birthday)==='under13'){update(s=>({...s,onboardingBlocked:true,onboardingDone:false}));return;}
  try{const next=updateBirthday(state,birthday.trim()||undefined);update(()=>next);setEditing(false);setNotice('');}catch(e){setNotice(e instanceof Error?e.message:'Check your birthday.');}
 }
 return <View style={styles.panel}>
  <Txt display style={styles.title}>Your sky</Txt>
  <Txt>{state.sunSign?`${state.sunSign} Sun`:'Your Sun sign is a mystery'}</Txt>
  <Txt style={styles.caption}>{!state.birthday?'Age not shared · teen-safe defaults':state.ageBand==='teen'?'Teen · ages 13–17':state.ageBand==='adult'?'18 and up':'Age not shared · teen-safe defaults'}</Txt>
  {state.birthday?<Txt style={styles.caption}>Birthday · {state.birthday}</Txt>:null}
  <Action label={editing?'Close birthday':'Edit birthday'} quiet onPress={()=>{setBirthday(state.birthday||'');setEditing(!editing)}}/>
  {editing?<><TextInput accessibilityLabel="Birthday YYYY-MM-DD" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={birthday} onChangeText={setBirthday} style={styles.input} maxLength={10}/><Action label="Save birthday" onPress={saveBirthday}/>{state.birthday?<Action label="Forget birthday" quiet onPress={()=>{update(s=>updateBirthday(s));setEditing(false)}}/>:null}</>:null}
  {state.moonSign?<Txt>{state.moonSign} Moon · {state.risingSign} rising</Txt>:null}
  {state.moonSign?<Txt style={styles.caption}>{state.plus?'Your Moon and rising shape every Why.':'With Plus, your Moon and rising shape every Why.'}</Txt>:null}
  {state.moonSign&&state.plus?(weather?<View testID="chart-weather" style={{marginTop:12}}><Txt style={[styles.caption,{color:colors.gold}]}>Chart weather · {new Date(`${month}-15T12:00:00`).toLocaleDateString(undefined,{month:'long'})}</Txt><Txt accessibilityLiveRegion="polite">{weather}</Txt></View>:aiConsent===null?<Txt style={styles.caption}>Allow AI processing in Ask to read your monthly chart weather.</Txt>:<Action testID="chart-weather-read" label={weatherBusy?'Reading your chart weather…':'Read this month’s chart weather'} quiet disabled={weatherBusy} onPress={()=>void readWeather()}/>):null}
  {state.moonSign&&!state.plus?<Action testID="chart-weather-plus" label="Monthly chart weather · Plus" quiet onPress={onUpgrade}/>:null}
  {state.birthday?<Action label={chartOpen?'Close birth details':'Add birth time and place'} quiet onPress={()=>setChartOpen(!chartOpen)}/>:null}
  {state.birthday&&chartOpen?<>
   <Txt style={[styles.caption,{marginTop:16}]}>Optional · your Moon and rising</Txt>
   {state.birthPlace?<Txt style={styles.caption}>{state.birthPlace} · {state.birthTime}</Txt>:null}
   <Txt style={styles.caption}>Birth time · local time, HH:MM</Txt>
   <TextInput accessibilityLabel="Birth time HH:MM" placeholder="14:30" placeholderTextColor={colors.muted} value={time} onChangeText={setTime} style={styles.input} maxLength={5}/>
   <Txt style={styles.caption}>Birth city</Txt>
   <TextInput accessibilityLabel="Birth city" placeholder="City, country" placeholderTextColor={colors.muted} value={place} onChangeText={value=>{request.current?.abort();setBusy(false);setPlace(value);setSelected(undefined);setPlaces([])}} style={styles.input} maxLength={100}/>
   <Action label={busy?'Finding your city…':'Find birth city'} quiet disabled={busy||place.trim().length<2} onPress={search}/>
   {places.map(p=><Action key={`${p.latitude},${p.longitude}`} label={p.name} quiet={selected!==p} onPress={()=>setSelected(p)}/>)}
   <Action label="Reveal Moon and rising" disabled={!selected||!time} onPress={()=>{try{if(!selected||!state.birthday)return;const chart=birthChart(state.birthday,time,selected.latitude,selected.longitude);update(s=>({...s,...chart,birthTime:time,birthPlace:selected.name,chartWeather:undefined}));setNotice('Calculated on this device.');}catch{setNotice('Check your time and place, then try again.');}}}/>
   {state.birthPlace?<Action label="Forget birth time and place" quiet onPress={()=>{update(s=>({...s,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined,chartWeather:undefined}));setTime('');setPlace('');setSelected(undefined);setPlaces([])}}/>:null}
   <Txt style={styles.caption}>City search: Open-Meteo / GeoNames. Only the city name is sent.</Txt>
  </>:null}
  {notice?<Txt accessibilityRole="alert">{notice}</Txt>:null}
 </View>;
}
