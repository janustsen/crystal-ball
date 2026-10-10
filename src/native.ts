import {Platform,Share} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import {nativeActions} from './integration-actions';
export const haptic=(kind:'selection'|'success'|'touch'|'pulse'='selection')=>{if(Platform.OS!=='web')void (kind==='success'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy):kind==='touch'||kind==='pulse'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft):Haptics.selectionAsync()).catch(()=>{});};
const actions=nativeActions({share:(message,url)=>Share.share({message,url}),link:(question)=>Linking.createURL('/',{queryParams:{friend:'1',question}})});
export const {friendLink}=actions;
export {forgetNotifications as forgetCheckIns} from './notify';

export function watchCheckIns(open:(id:string)=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const data=response?.notification.request.content.data,id=data?.checkIns?'':data?.readingId;if(typeof id==='string'){open(id);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}
