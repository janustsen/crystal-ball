import React,{useState} from 'react';
import {Platform,View} from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {Action,styles,Txt} from './ui';
import {setSocialPush} from './social';
export function SocialPush(){
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 if(Platform.OS==='web')return null;
 async function enable(){
  setBusy(true);
  try{
   const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
   if(!projectId)throw new Error('Push notifications are not configured in this build.');
   if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'Circle invitations and forecasts',importance:Notifications.AndroidImportance.DEFAULT});
   if((await Notifications.requestPermissionsAsync()).status!=='granted')throw new Error('Notifications are off. You can enable them in device settings.');
   await setSocialPush((await Notifications.getExpoPushTokenAsync({projectId})).data);setNotice('Circle notifications enabled.');
  }catch(error){setNotice(error instanceof Error?error.message:'Notifications could not be enabled.')}finally{setBusy(false)}
 }
 return <View style={styles.panel}><Txt>Circle notifications</Txt><Txt style={styles.caption}>Sealed forecasts, invitations, someone joining, and Circle forecasts and check-ins only. No activity or glow notifications.</Txt><Action label="Enable Circle notifications" disabled={busy} onPress={()=>void enable()}/><Action label="Turn off Circle notifications" quiet disabled={busy} onPress={()=>{setBusy(true);void setSocialPush(null).then(()=>setNotice('Circle notifications off.')).catch(()=>setNotice('Could not turn notifications off. Try again.')).finally(()=>setBusy(false))}}/>{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}</View>;
}
export function watchSocialPushes(open:()=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{if(response?.notification.request.content.data?.social===true){open();void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const subscription=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>subscription.remove();
}
