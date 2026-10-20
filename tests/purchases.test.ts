import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as catalog from '../src/billing.ts';
import {purchaseOfferings} from '../src/integration-actions.ts';

// Exercise the shipped adapter with just StoreKit/React Native and network boundaries replaced.
function fixture({mode,os='ios',dev=false,metered=true,key='appl_test'}:{mode?:string;os?:string;dev?:boolean;metered?:boolean;key?:string}={}){
 let owner:string|null='owner',sdkOwner='',error:unknown,restoreError:unknown,syncError:unknown,syncs=0;
 const calls:string[]=[];
 const pkg=(id:string)=>({product:{identifier:id,priceString:'localized '+id,introPrice:{price:0}}});
 const sdk={configure:({appUserID}:any)=>{sdkOwner=appUserID;calls.push('configure')},getAppUserID:async()=>sdkOwner,logIn:async(id:string)=>{sdkOwner=id;calls.push('login '+id)},
  getOfferings:async()=>({current:{availablePackages:[...catalog.plans,...catalog.packs].map(p=>pkg(p.product))}}),
  checkTrialOrIntroductoryPriceEligibility:async()=>Object.fromEntries(catalog.plans.map(p=>[p.product,{status:p.kind==='weekly'?1:0}])),
  purchasePackage:async()=>{calls.push('purchase');if(error)throw error},restorePurchases:async()=>{calls.push('restore');if(restoreError)throw restoreError}};
 const balance={owner:'owner',plus:true,packs:5};
 const imports:Record<string,unknown>={'react-native':{Platform:{OS:os}},'react-native-purchases':{__esModule:true,default:sdk,INTRO_ELIGIBILITY_STATUS:{INTRO_ELIGIBILITY_STATUS_ELIGIBLE:1},PURCHASES_ERROR_CODE:{PURCHASE_CANCELLED_ERROR:'cancel',PAYMENT_PENDING_ERROR:'pending'}},'./billing':catalog,'./integration-actions':{purchaseOfferings},'./cloud':{anonymousOwner:async()=>owner},'./api':{serverMetered:metered,syncStoreBalance:async()=>{syncs++;if(syncError)throw syncError;return balance}}};
 const code=ts.transpileModule(readFileSync(new URL('../src/purchases.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],__DEV__:dev,process:{env:{EXPO_PUBLIC_REVENUECAT_MODE:mode,EXPO_PUBLIC_REVENUECAT_IOS_KEY:key}}});
 return {api:module.exports,calls,balance,syncs:()=>syncs,owner:(id:string|null)=>{owner=id},error:(value:unknown)=>{error=value},restoreError:(value:unknown)=>{restoreError=value},syncError:(value:unknown)=>{syncError=value}};
}

test('release iOS defaults to store and cannot be switched to simulated purchases',async()=>{
 for(const mode of [undefined,'mock','store']){const f=fixture({mode});assert.equal(f.api.purchaseMode,'store');assert.equal(f.api.storeAvailable,true)}
 for(const options of [{os:'web'},{mode:'mock',dev:true}]){
  const f=fixture(options);assert.equal(f.api.purchaseMode,'mock');assert.equal((await f.api.storeOffers()).length,0);
  await assert.rejects(f.api.buy({}));await assert.rejects(f.api.restore());assert.deepEqual(f.calls,[]);
 }
 for(const options of [{key:''},{metered:false},{mode:'store',os:'web'}]){
  const f=fixture(options);assert.equal(f.api.storeAvailable,false);await assert.rejects(f.api.buy({}));await assert.rejects(f.api.restore());assert.deepEqual(f.calls,[]);
 }
});

test('store offers use localized prices, eligible trials, the current owner and the annual gate',async()=>{
 const f=fixture(),offers=await f.api.storeOffers();
 assert.deepEqual(Array.from(offers,(o:any)=>o.kind),['weekly','monthly','five','twenty']);
 assert.equal(offers[0].price,'localized cb_plus_weekly');assert.equal(offers[0].trial,true);assert.equal(offers[1].trial,false);
 f.owner('second');await f.api.storeOffers();assert.deepEqual(f.calls,['configure','login second']);
 f.owner(null);await assert.rejects(f.api.buy(offers[0]),/account session/);assert.ok(!f.calls.includes('purchase'));
});

test('success, cancellation, pending and failure never grant local entitlements',async()=>{
 const f=fixture(),offer=(await f.api.storeOffers())[0];
 assert.equal(await f.api.buy(offer),'purchased');assert.equal(f.syncs(),0,'the UI must reconcile before applying an entitlement');
 f.error({code:'cancel'});assert.equal(await f.api.buy(offer),'cancelled');
 f.error({code:'pending'});assert.equal(await f.api.buy(offer),'pending');
 f.error(new Error('store offline'));await assert.rejects(f.api.buy(offer),/store offline/);
 assert.equal(f.syncs(),0);
});

test('restore returns only the reconciled server balance; failures remain retryable',async()=>{
 const f=fixture();assert.strictEqual(await f.api.restore(),f.balance);assert.equal(f.syncs(),1);
 f.restoreError(new Error('store offline'));await assert.rejects(f.api.restore(),/store offline/);assert.equal(f.syncs(),1);
 f.restoreError(undefined);f.syncError(new Error('server offline'));await assert.rejects(f.api.restore(),/server offline/);
 f.syncError(undefined);assert.strictEqual(await f.api.restore(),f.balance);assert.equal(f.syncs(),3);
});
