import {Linking,Platform} from 'react-native';
import Purchases,{INTRO_ELIGIBILITY_STATUS,PURCHASES_ERROR_CODE,type PurchasesOfferings,type PurchasesPackage} from 'react-native-purchases';
import {purchaseOfferings} from './integration-actions';
import {serverMetered,syncStoreBalance} from './api';
import {anonymousOwner} from './cloud';
import {manageSubscriptionsUrl,packs,plans,trialProduct,type Balance,type PackKind,type PlanKind} from './billing';

// mock: preview simulation. store: real App Store purchases through RevenueCat (sandbox on development and TestFlight builds).
export const purchaseMode=process.env.EXPO_PUBLIC_REVENUECAT_MODE==='store'?'store':'mock';
const key=process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
export const storeAvailable=purchaseMode==='store'&&Platform.OS==='ios'&&!!key&&serverMetered;
export type Offer={kind:PlanKind|PackKind;price:string;trial:boolean;pkg:PurchasesPackage};

// RevenueCat's app user id is the Supabase user, so webhooks and the server ledger name the same person.
let configured=false;
async function offerings(){
 const viewer=await anonymousOwner();if(!viewer)throw new Error('Purchases need an account session.');
 const result=await purchaseOfferings(purchaseMode,Platform.OS,key,{configure:apiKey=>{if(!configured){Purchases.configure({apiKey,appUserID:viewer});configured=true}},get:async()=>{
  if(await Purchases.getAppUserID()!==viewer)await Purchases.logIn(viewer);
  return Purchases.getOfferings();
 }});
 return result.offerings as PurchasesOfferings|null;
}
export async function storeOffers():Promise<Offer[]>{
 const available=(await offerings())?.current?.availablePackages??[];
 const eligibility=await Purchases.checkTrialOrIntroductoryPriceEligibility([trialProduct]);
 return available.flatMap(pkg=>{
  const item=[...plans,...packs].find(p=>p.product===pkg.product.identifier);
  const trial=pkg.product.identifier===trialProduct&&pkg.product.introPrice?.price===0&&eligibility[trialProduct]?.status===INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  return item?[{kind:item.kind,price:pkg.product.priceString,trial,pkg}]:[];
 });
}
// The App Store result only; the caller then reconciles the server balance, which is the entitlement.
export async function buy(offer:Offer):Promise<'purchased'|'cancelled'>{
 await offerings();
 try{await Purchases.purchasePackage(offer.pkg);return 'purchased'}catch(error){if((error as {code?:string}).code===PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)return 'cancelled';throw error}
}
export async function restore():Promise<Balance>{await offerings();await Purchases.restorePurchases();return syncStoreBalance();}
export const manageSubscriptions=()=>Linking.openURL(manageSubscriptionsUrl);
