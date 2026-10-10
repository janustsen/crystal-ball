import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import type {Planned} from './ritual';

// Foreground notifications are shown (social, check-ins), except the ritual's own: the app is already open.
if(Platform.OS!=='web')Notifications.setNotificationHandler({handleNotification:async notification=>{const ritual=!!notification.request.content.data?.ritual;return {shouldShowBanner:!ritual,shouldShowList:!ritual,shouldPlaySound:false,shouldSetBadge:false}}});

export async function allowNotifications(request:boolean){
 if(Platform.OS==='web')return false;
 return (await (request?Notifications.requestPermissionsAsync():Notifications.getPermissionsAsync())).status==='granted';
}
let work:Promise<void>=Promise.resolve();
// Replaces every pending ritual notification with the plan. Check-in reminders keep their own identifiers.
export function scheduleRitual(plan:Planned[]){
 if(Platform.OS==='web')return work;
 work=work.catch(()=>{}).then(async()=>{
  if(!await allowNotifications(false))return;
  for(const pending of await Notifications.getAllScheduledNotificationsAsync())if(pending.identifier.startsWith('ritual-'))await Notifications.cancelScheduledNotificationAsync(pending.identifier);
  for(const p of plan)await Notifications.scheduleNotificationAsync({identifier:p.id,content:{title:p.title,body:p.body,data:p.data},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:p.at}});
 });
 return work;
}
// Development and verification only: one ritual notification a few seconds from now.
export async function testNotification(seconds=5){
 if(!await allowNotifications(true))return false;
 await Notifications.scheduleNotificationAsync({identifier:'ritual-test',content:{title:'Crystal Ball',body:'Your omen is waiting.',data:{ritual:'morning'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds}});
 return true;
}
export function watchRitualTaps(open:(kind:string)=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const kind=response?.notification.request.content.data?.ritual;if(typeof kind==='string'){open(kind);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}
