import {Platform,Share} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import {nativeActions} from './integration-actions';
export const haptic=(kind:'selection'|'success'|'touch'|'pulse'='selection')=>{if(Platform.OS!=='web')void (kind==='success'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy):kind==='touch'||kind==='pulse'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft):Haptics.selectionAsync()).catch(()=>{});};
const actions=nativeActions({platform:Platform.OS,notifications:{cancel:async(readingId)=>{await Notifications.cancelScheduledNotificationAsync(`check-in-${readingId}`);await Notifications.cancelScheduledNotificationAsync(`check-in-${readingId}-reminder`);},clear:async()=>{await Notifications.cancelAllScheduledNotificationsAsync();await Notifications.dismissAllNotificationsAsync();await Notifications.clearLastNotificationResponseAsync();},permission:async(request)=>(await (request?Notifications.requestPermissionsAsync():Notifications.getPermissionsAsync())).status==='granted',schedule:async(title,body,seconds,readingId,followUp)=>{await Notifications.scheduleNotificationAsync({identifier:readingId?`check-in-${readingId}${followUp?'-reminder':''}`:undefined,content:{title,body,data:{readingId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds}});}},share:(message,url)=>Share.share({message,url}),link:(question)=>Linking.createURL('/',{queryParams:{friend:'1',question}})});
export const {forgetCheckIns,cancelCheckIn,reminder,friendLink}=actions;

export function watchCheckIns(open:(id:string)=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const id=response?.notification.request.content.data?.readingId;if(typeof id==='string'){open(id);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}
