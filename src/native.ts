import {Platform,Share} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Apple from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import {anonymousOwner,supabase} from './cloud';
import {nativeActions} from './integration-actions';
export const haptic=(kind:'selection'|'success'|'touch'|'pulse'='selection')=>{if(Platform.OS!=='web')void (kind==='success'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy):kind==='touch'||kind==='pulse'?Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft):Haptics.selectionAsync()).catch(()=>{});};
const actions=nativeActions({platform:Platform.OS,notifications:{permission:async(request)=>(await (request?Notifications.requestPermissionsAsync():Notifications.getPermissionsAsync())).status==='granted',schedule:async(title,body,seconds,readingId)=>{await Notifications.scheduleNotificationAsync({identifier:readingId?`check-in-${readingId}`:undefined,content:{title,body,data:{readingId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds}});}},apple:{available:Apple.isAvailableAsync,enabled:!!supabase&&process.env.EXPO_PUBLIC_APPLE_LINK_ENABLED==='true',owner:anonymousOwner,signIn:async()=>(await Apple.signInAsync({requestedScopes:[Apple.AppleAuthenticationScope.FULL_NAME,Apple.AppleAuthenticationScope.EMAIL]})).identityToken,link:async(token)=>{if(!supabase)throw new Error('Supabase unavailable');const result=await supabase.auth.linkIdentity({provider:'apple',token});if(result.error)throw result.error;return result.data.user?.id;}},share:(message,url)=>Share.share({message,url}),link:(question)=>Linking.createURL('/',{queryParams:{friend:'1',question}})});
export const {reminder,saveWithApple,friendLink}=actions;

export function watchCheckIns(open:(id:string)=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const id=response?.notification.request.content.data?.readingId;if(typeof id==='string'){open(id);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}
