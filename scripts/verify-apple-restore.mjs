import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

// Run the real panel and store; only native/auth/storage boundaries are replaced.
const mocks={
 surface:`import React from 'react';export const Surface=({children})=><div>{children}</div>`,
 nativeActions:`export const forgetCheckIns=async()=>{}`,
 widget:`export const updateOmenWidget=()=>{}`,
 cloud:`
 export const supabase={auth:{
  getSession:async()=>({data:{session:{user:{id:window.control.owner,is_anonymous:false,identities:window.control.linked===false?[]:[{provider:'apple'}]}}},error:null}),
  linkIdentity:async()=>{window.control.links++;window.control.linked=true;return {data:{user:{id:window.control.owner}},error:null}},
  signInWithIdToken:async()=>{window.control.switches++;window.control.owner='account-b';return {data:{user:{id:'account-b'}},error:null}}
 }};
 export async function deleteAppleAccount(code){if(code!=='fresh-code')throw Error('Apple code missing');window.control.deletions=(window.control.deletions||0)+1;if(window.control.deleteFails)throw Error('Synthetic server deletion failed')}
 export const anonymousOwner=async()=>window.control.owner;
 export async function restoreBackup(state){window.control.reads++;throw Error('Archive unavailable')}
 export async function mirror(state){if(state.backupOwner!==window.control.owner)throw Error('Wrong owner');window.control.uploads++}
 `,
 storage:`export default {getItem:async key=>key==='crystal-ball-v1'?window.control.disk:null,setItem:async(key,value)=>{if(key==='crystal-ball-v1')window.control.disk=value}}`,
 native:`import React from 'react';export const Platform={OS:'ios'};export const View=({children})=><div>{children}</div>;export const Alert={alert:(title,body,actions)=>{window.control.confirmation={title,body};window.control.confirm=()=>actions.find(a=>a.style==='destructive').onPress()}}`,
 apple:`import React from 'react';export const isAvailableAsync=async()=>true;export const AppleAuthenticationButtonType={CONTINUE:0},AppleAuthenticationButtonStyle={WHITE:0};export const AppleAuthenticationButton=({onPress})=><button onClick={onPress}>Continue with Apple</button>;export async function signInAsync(){window.control.appleCalls++;return {identityToken:'synthetic',authorizationCode:'fresh-code'}}`,
 crypto:`export const randomUUID=()=> 'nonce';export const getRandomValues=bytes=>bytes;export const CryptoDigestAlgorithm={SHA256:0};export const digestStringAsync=async()=> 'digest'`,
 ui:`import React from 'react';export const styles={panel:{},caption:{}};export const CardHeader=()=>null;export const Txt=({children})=><div>{children}</div>;export const Action=({label,onPress,disabled})=><button onClick={onPress} disabled={disabled}>{label}</button>`
};
const routes={'./native':'nativeActions','./omen-widget':'widget','./cloud':'cloud','@react-native-async-storage/async-storage':'storage','react-native':'native','expo-apple-authentication':'apple','expo-crypto':'crypto','./ui':'ui','./Surface':'surface'};
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Store,useStore} from './src/store';import {BackupPanel} from './src/BackupPanel';function Probe(){window.store=useStore();return <BackupPanel/>}createRoot(document.getElementById('root')).render(<Store><Probe/></Store>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env':'{}','process.env.NODE_ENV':'"development"','process.env.EXPO_PUBLIC_APPLE_LINK_ENABLED':'"true"'},plugins:[{name:'native-boundaries',setup(b){
 b.onResolve({filter:/.*/},args=>routes[args.path]?{path:routes[args.path],namespace:'mock'}:undefined);
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:mocks[path],loader:'tsx',resolveDir:process.cwd()}));
}}]});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();page.on('pageerror',error=>console.error('Browser error:',error.message));await page.setContent('<div id="root"></div>');
 await page.evaluate(()=>{window.control={owner:'account-a',appleCalls:0,switches:0,reads:0,uploads:0,disk:JSON.stringify({sunSign:null,ageBand:'teen',ageConfirmed:true,onboardingDone:true,facts:{practice:'daily'},history:[{id:'local-reading'}],credits:5,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,backupOwner:'account-a'})}});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForFunction(()=>window.store?.ready&&window.control.uploads>0);
 const before=await page.evaluate(()=>window.control.disk);
 await page.getByRole('button',{name:'Restore an Apple backup',exact:true}).click();
 assert.equal(await page.getByText('Restore from your linked Apple account. If you haven’t linked Apple yet, sign in to choose your backup.',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Continue with Apple',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>window.control.confirmation),{title:'Replace this device’s data?',body:'Restore from your linked Apple account replaces this device’s readings and remembered answers. If you haven’t linked Apple yet, sign in to choose your backup. Use one device at a time.'});
 assert.equal(await page.evaluate(()=>window.control.reads),0);
 await page.evaluate(()=>window.control.confirm());
 await page.getByText('Restore could not finish.',{exact:false}).waitFor();
 const failed=await page.evaluate(()=>({owner:window.control.owner,backupOwner:window.store.state.backupOwner,disk:window.control.disk,appleCalls:window.control.appleCalls,reads:window.control.reads}));
 assert.deepEqual(failed,{owner:'account-a',backupOwner:'account-a',disk:before,appleCalls:0,reads:1});
 const uploads=await page.evaluate(()=>{const n=window.control.uploads;window.store.update(s=>({...s}));return n});
 await page.waitForFunction(n=>window.control.uploads>n,uploads);
 await page.evaluate(()=>{window.control.linked=false;window.control.links=0;window.store.update(s=>({...s,backupOwner:undefined}))});
 await page.getByRole('button',{name:'Save this device with Apple',exact:true}).click();
 await page.getByText('Save this device’s history',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue with Apple',exact:true}).click();
 await page.getByText('History backed up. Your readings are here.',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>({appleCalls:window.control.appleCalls,links:window.control.links,owner:window.store.state.backupOwner,switches:window.control.switches})),{appleCalls:1,links:1,owner:'account-a',switches:0});
 // A refused server deletion preserves the archive. A successful deletion clears it under the same lock.
 await page.evaluate(()=>{window.control.deleteFails=true;});
 const deletion=page.getByRole('button',{name:'Delete account and data',exact:true});
 await deletion.click();await page.evaluate(()=>window.control.confirm());
 await page.getByText('Synthetic server deletion failed',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(window.control.disk).history.length),1);
 assert.equal(await page.evaluate(()=>window.store.state.backupOwner),'account-a');
 await page.evaluate(()=>{window.control.deleteFails=false;});
 await deletion.click();await page.evaluate(()=>window.control.confirm());
 await page.getByText('Your Apple access, account and saved data have been deleted.',{exact:true}).waitFor();
 const removed=await page.evaluate(()=>({history:window.store.state.history,facts:window.store.state.facts,owner:window.store.state.backupOwner,disk:JSON.parse(window.control.disk),deletions:window.control.deletions}));
 assert.deepEqual(removed.history,[]);assert.deepEqual(removed.facts,{});assert.equal(removed.owner,undefined);assert.equal(removed.disk.backupOwner,undefined);assert.deepEqual(removed.disk.history,[]);assert.equal(removed.deletions,2);
 console.log('Apple account deletion: failed server preserves archive; successful server clears local archive and backup owner. Native/remote boundaries are fixtures.');
 console.log('Restore account wording and confirmation; first-time Apple linking: passed');
 console.log('failed restore preserves the existing Apple session, local archive, and future automatic backups: passed');
}finally{await browser.close()}
