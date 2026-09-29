import {Platform} from 'react-native';
import Purchases from 'react-native-purchases';
export const purchaseMode=process.env.EXPO_PUBLIC_REVENUECAT_MODE==='sandbox'?'sandbox':'mock';
let configured=false;
export async function offerings(){
 if(purchaseMode==='mock')return {mode:'mock' as const,offerings:null};
 const key=process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
 if(Platform.OS!=='ios'||!key)throw new Error('RevenueCat sandbox requires the configured iOS development build.');
 if(!configured){Purchases.configure({apiKey:key});configured=true;}
 return {mode:'sandbox' as const,offerings:await Purchases.getOfferings()};
}
export async function restoreSandbox(){await offerings();if(purchaseMode==='mock')return null;return Purchases.restorePurchases();}
