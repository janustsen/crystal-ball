import React,{useState} from 'react';
import {Platform,View} from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {Action,styles,Txt,Toggle} from './ui';
import {setSocialPush,setSkyPush} from './social';
import {Surface} from './Surface';
// One shared device token; Circle and Friday Sky consent are saved separately with it.
async function devicePushToken(){
 const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
 if(!projectId)throw new Error('Push notifications are not configured in this build.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'Circle invitations and forecasts',importance:Notifications.AndroidImportance.DEFAULT});
 if((await Notifications.requestPermissionsAsync()).status!=='granted')throw new Error('Notifications are off. You can enable them in device settings.');
 return (await Notifications.getExpoPushTokenAsync({projectId})).data;
}
export function SkyPushPrompt({answered,onAnswered}:{answered:boolean;onAnswered:(enabled:boolean)=>void}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 if(Platform.OS==='web')return null;
 async function answer(enabled:boolean){
  if(busy)return;setBusy(true);setNotice('');
  try{
   await setSkyPush(false);onAnswered(false);
   if(enabled){await setSkyPush(true,await devicePushToken());onAnswered(true);setNotice('Friday Sky notifications enabled.');}
  }catch(error){setNotice((error instanceof Error?error.message:'Could not save your choice.')+' You can change Friday Sky notifications in Circles.');}
  finally{setBusy(false);}
 }
 if(answered)return notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null;
 return <View testID="sky-push-prompt" style={styles.panel}><Surface kind="card"><Txt>Know when the Sky opens?</Txt><Txt style={styles.caption}>Get one notification on Fridays at 8pm your time when your school or Circle has a shared omen. Off unless you choose. Change this later in Circle notification settings.</Txt><Action testID="sky-push-accept" label="Notify me on Fridays" disabled={busy} onPress={()=>void answer(true)}/><Action testID="sky-push-dismiss" label="Not now" quiet disabled={busy} onPress={()=>void answer(false)}/>{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null}</Surface></View>;
}
export function SocialPush({skyPush,onSkyPush}:{skyPush:boolean;onSkyPush:(enabled:boolean,token?:string)=>Promise<void>}){
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 if(Platform.OS==='web')return null;
 async function enable(){
  setBusy(true);
  try{await setSocialPush(await devicePushToken());setNotice('Circle notifications enabled.');}
  catch(error){setNotice(error instanceof Error?error.message:'Notifications could not be enabled.');}finally{setBusy(false);}
 }
 async function changeSky(enabled:boolean){
  if(busy)return;setBusy(true);setNotice('');
  try{await onSkyPush(enabled,enabled?await devicePushToken():undefined);}
  catch(error){setNotice(error instanceof Error?error.message:'Notifications could not be enabled.');}finally{setBusy(false);}
 }
 return <View style={styles.panel}><Surface kind="card"><Txt>Circle notifications</Txt><Txt style={styles.caption}>Sealed forecasts, invitations, someone joining, and Circle forecasts and check-ins. No activity or glow notifications. Friday Sky notifications below are a separate choice; turning off Circle notifications does not change them.</Txt><Action label="Enable Circle notifications" disabled={busy} onPress={()=>void enable()}/><Action label="Turn off Circle notifications" quiet disabled={busy} onPress={()=>{setBusy(true);void setSocialPush(null).then(()=>setNotice('Circle notifications off.')).catch(()=>setNotice('Could not turn notifications off. Try again.')).finally(()=>setBusy(false))}}/><View style={[styles.row,{marginTop:16}]}><Txt>The Sky opens · Fridays 8pm</Txt><Toggle testID="sky-push-toggle" accessibilityLabel="Notify me when the Sky opens on Fridays" value={skyPush} disabled={busy} onValueChange={enabled=>void changeSky(enabled)}/></View>{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null}</Surface></View>;
}
export function watchSocialPushes(open:(section:'sky'|'circles')=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const data=response?.notification.request.content.data;if(data?.social===true){open(data.sky===true?'sky':'circles');void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const subscription=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>subscription.remove();
}
