import React,{useEffect,useState} from 'react';
import {TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {Action,styles,Txt} from './ui';
import {nearbySchools,searchSchools} from './schools';
import {setSchool,type School} from './social';

const attemptedKey='crystal-ball-school-location-asked';
export function SchoolPicker({schools,selected,onSaved}:{schools:School[];selected:string|null;onSaved:()=>void}){
 const [editing,setEditing]=useState(false),[query,setQuery]=useState(''),[nearby,setNearby]=useState<School[]|null>(null),[attempted,setAttempted]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{void AsyncStorage.getItem(attemptedKey).then(value=>setAttempted(value==='yes')).catch(()=>{});},[]);
 async function locate(){
  if(busy||attempted)return;
  setBusy(true);setAttempted(true);setNotice('');
  try{
   // Persist only the prompt decision, BEFORE asking, never a location.
   await AsyncStorage.setItem(attemptedKey,'yes');
   const permission=await Location.requestForegroundPermissionsAsync();
   if(!permission.granted)throw new Error('Search by name instead.');
   const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Lowest});
   const matches=nearbySchools(schools,position.coords.latitude,position.coords.longitude);
   setNearby(matches);setNotice(matches.length?'Choose your school below.':'No nearby schools in this small catalog. Search by name or skip.');
  }catch{setNotice('Location is unavailable. Search by name or skip.')}finally{setBusy(false)}
 }
 async function save(id:string|null){
  setBusy(true);setNotice('');
  try{await setSchool(id);setEditing(false);setNearby(null);setQuery('');onSaved()}catch{setNotice('Your school could not be saved. Try again.')}finally{setBusy(false)}
 }
 const current=schools.find(s=>s.id===selected);
 return <View style={[styles.panel,{marginBottom:20}]}>
  <Txt>{current?current.name:'Your school · optional'}</Txt>
  {!editing?<Action label={selected?'Change school':'Choose my school'} quiet onPress={()=>setEditing(true)}/>:<>
   <Txt style={styles.caption}>Find nearby schools once, or search by name. Location stays on this device and is never saved or shared. Only your chosen school is saved. Your anonymous Stars can appear in its sky; invited friends at the same school can see Circle suggestions.</Txt>
   {!attempted?<Action label="Find nearby schools once" disabled={busy} onPress={()=>void locate()}/>:null}
   <TextInput accessibilityLabel="Search school name" value={query} onChangeText={value=>{setQuery(value);setNearby(null)}} style={styles.input} placeholder="Search school name"/>
   <Txt style={styles.caption}>Small starter catalog · San Francisco schools. If yours is missing, skip for now.</Txt>
   {searchSchools(nearby??schools,query).map(school=><Action key={school.id} label={`Choose ${school.name}`} quiet disabled={busy} onPress={()=>void save(school.id)}/>)}
   {!searchSchools(nearby??schools,query).length?<Txt style={styles.caption}>No matching schools.</Txt>:null}
   {selected?<Action label="Remove my school" quiet disabled={busy} onPress={()=>void save(null)}/>:null}
   <Action label="Skip school selection" quiet disabled={busy} onPress={()=>{setEditing(false);setNearby(null);setQuery('')}}/>
  </>}
  {notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}
 </View>;
}
