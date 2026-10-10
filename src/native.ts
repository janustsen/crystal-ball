import {AppState,Platform,Share} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import {nativeActions} from './integration-actions';
import {checkInDate} from './retention';
import type {Whisper} from './types';
const permissionListeners=new Set<()=>void>();
export async function requestNotificationPermission(){
 const permission=await Notifications.requestPermissionsAsync();
 if(permission.status==='granted')for(const reconcile of permissionListeners)reconcile();
 return permission;
}
export const haptic=(kind:'selection'|'success'|'touch'|'pulse'='selection')=>{if(Platform.OS!=='web')void (kind==='success'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy):kind==='touch'||kind==='pulse'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft):Haptics.selectionAsync()).catch(()=>{});};
const actions=nativeActions({platform:Platform.OS,notifications:{cancel:async(readingId)=>{await Notifications.cancelScheduledNotificationAsync(`check-in-${readingId}`);await Notifications.cancelScheduledNotificationAsync(`check-in-${readingId}-reminder`);},clear:async()=>{await Notifications.cancelAllScheduledNotificationsAsync();await Notifications.dismissAllNotificationsAsync();await Notifications.clearLastNotificationResponseAsync();await scheduleWeekRecap();},permission:async(request)=>(await (request?requestNotificationPermission():Notifications.getPermissionsAsync())).status==='granted',schedule:async(title,body,seconds,readingId,followUp)=>{await Notifications.scheduleNotificationAsync({identifier:readingId?`check-in-${readingId}${followUp?'-reminder':''}`:undefined,content:{title,body,data:{readingId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds}});}},share:(message,url)=>Share.share({message,url}),link:(question)=>Linking.createURL('/',{queryParams:{friend:'1',question}})});
export const {forgetCheckIns,reopenCheckIn,cancelCheckIn,reminder,friendLink}=actions;

export function watchCheckIns(open:(id:string)=>void,openRitual:(destination:'whisper'|'recap')=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const data=response?.notification.request.content.data;if(data?.destination==='whisper'||data?.destination==='recap'){openRitual(data.destination);void Notifications.clearLastNotificationResponseAsync();}else if(typeof data?.readingId==='string'){open(data.readingId);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}

// Minimal local hooks until the shared engagement scheduler lands. Neither asks for permission; both stay inside 08:00-21:00.
const granted=async()=>Platform.OS!=='web'&&(await Notifications.getPermissionsAsync()).status==='granted';
// The lock screen never shows the whisper itself.
export async function scheduleWhisperCheck(day:string){
 const at=checkInDate(day);if(!at)return;
 at.setDate(at.getDate()+1);at.setHours(8,30,0,0);
 if(at.getTime()<=Date.now()||!await granted())return;
 await Notifications.scheduleNotificationAsync({identifier:`whisper-check-${day}`,content:{title:'Did yesterday’s whisper land?',body:'One tap tells the Ball.',data:{destination:'whisper'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:at}}).catch(()=>{});
}
export function cancelWhisperCheck(day:string){if(Platform.OS!=='web')void Notifications.cancelScheduledNotificationAsync(`whisper-check-${day}`).catch(()=>{});}
// Sunday 18:00, repeating; one pending slot. Scheduling the same identifier again replaces it.
export async function scheduleWeekRecap(){
 if(!await granted())return;
 await Notifications.scheduleNotificationAsync({identifier:'week-recap',content:{title:'Your week in the Ball',body:'Seven days of whispers and readings, gathered.',data:{destination:'recap'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.WEEKLY,weekday:1,hour:18,minute:0}}).catch(()=>{});
}

export function watchRitualReminders(whispers:Whisper[]=[]){
 if(Platform.OS==='web')return ()=>{};
 const reconcile=()=>{void scheduleWeekRecap().catch(()=>{});for(const whisper of whispers)if(!whisper.outcome)void scheduleWhisperCheck(whisper.day).catch(()=>{});};
 permissionListeners.add(reconcile);
 const listener=AppState.addEventListener('change',state=>{if(state==='active')reconcile()});
 reconcile();
 return ()=>{permissionListeners.delete(reconcile);listener.remove();};
}
