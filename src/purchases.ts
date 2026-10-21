import {Linking,Platform} from 'react-native';
import Purchases,{INTRO_ELIGIBILITY_STATUS,PURCHASES_ERROR_CODE,type PurchasesOfferings,type PurchasesPackage} from 'react-native-purchases';
import {purchaseOfferings} from './integration-actions';
import {serverMetered,syncStoreBalance} from './api';
import {anonymousOwner} from './cloud';
import {manageSubscriptionsUrl,packs,offeredPlans,trialProducts,type Balance,type PackKind,type PlanKind} from './billing';

// mock: preview simulation. store: real App Store purchases through RevenueCat (sandbox on development and TestFlight builds).
const dev=typeof __DEV__!=='undefined'&&__DEV__;
// Release iOS builds fail closed into StoreKit even if an environment variable is missing or says mock.
export const purchaseMode=(Platform.OS==='web'&&process.env.EXPO_PUBLIC_REVENUECAT_MODE!=='store')||(dev&&process.env.EXPO_PUBLIC_REVENUECAT_MODE==='mock')?'mock':'store';
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
 if(purchaseMode==='mock')return [];
 if(!storeAvailable)throw new Error('App Store purchases require the configured iOS build.');
 const available=(await offerings())?.current?.availablePackages??[];
 const eligibility=await Purchases.checkTrialOrIntroductoryPriceEligibility(trialProducts);
 return available.flatMap(pkg=>{
  const item=[...offeredPlans,...packs].find(p=>p.product===pkg.product.identifier);
  const id=pkg.product.identifier,trial=trialProducts.includes(id)&&pkg.product.introPrice?.price===0&&eligibility[id]?.status===INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  return item?[{kind:item.kind,price:pkg.product.priceString,trial,pkg}]:[];
 });
}
// The App Store result only; the caller then reconciles the server balance, which is the entitlement.
export async function buy(offer:Offer):Promise<'purchased'|'cancelled'|'pending'>{
 if(!storeAvailable)throw new Error('App Store purchases require the configured iOS build.');
 await offerings();
 try{await Purchases.purchasePackage(offer.pkg);return 'purchased'}catch(error){if((error as {code?:string}).code===PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)return 'cancelled';if((error as {code?:string}).code===PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)return 'pending';throw error}
}
export async function restore():Promise<Balance>{if(!storeAvailable)throw new Error('App Store purchases require the configured iOS build.');await offerings();await Purchases.restorePurchases();return syncStoreBalance();}
export const manageSubscriptions=()=>Linking.openURL(manageSubscriptionsUrl);
