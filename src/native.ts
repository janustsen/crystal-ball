import {Platform,Share} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Apple from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
export const haptic=()=>{if(Platform.OS!=='web')void Haptics.selectionAsync();};
export async function reminder(headline:string){
 if(Platform.OS==='web')return 'Native reminder preview: check back in 30 days. Local notifications need an iOS or Android build.';
 const permission=await Notifications.requestPermissionsAsync();if(permission.status!=='granted')return 'Notifications are off. You can still check back from History.';
 await Notifications.scheduleNotificationAsync({content:{title:'Did the Ball get it right?',body:headline},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:30*86400}});
 return 'Check-back reminder set for 30 days.';
}
export async function saveWithApple(){
 if(Platform.OS!=='ios'||!await Apple.isAvailableAsync())return 'Sign in with Apple needs the configured iOS app. Your readings are saved on this device.';
 // Do not start an identity migration until the project's Apple/Supabase credentials exist.
 if(!process.env.EXPO_PUBLIC_SUPABASE_URL)return 'Apple account saving is not configured yet. Your readings remain on this device.';
 return 'Apple account linking needs the project OAuth configuration described in SETUP.md. No account was changed.';
}
export async function friendLink(question:string){
 const url=Linking.createURL('/',{queryParams:{friend:'1',question}});
 await Share.share({message:`Ask the Crystal Ball for yourself: ${url}`,url});return url;
}
