import {Platform} from 'react-native';
import Purchases from 'react-native-purchases';
import {purchaseOfferings} from './integration-actions';
export const purchaseMode=process.env.EXPO_PUBLIC_REVENUECAT_MODE==='sandbox'?'sandbox':'mock';
let configured=false;
export const offerings=()=>purchaseOfferings(purchaseMode,Platform.OS,process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,{configure:key=>{if(!configured){Purchases.configure({apiKey:key});configured=true;}},get:()=>Purchases.getOfferings()});
export async function restoreSandbox(){await offerings();if(purchaseMode==='mock')return null;return Purchases.restorePurchases();}
