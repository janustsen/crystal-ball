import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

// Run the real panel and store; only native/auth/storage boundaries are replaced.
const mocks={
 cloud:`
 export const supabase={auth:{
  getSession:async()=>({data:{session:{user:{id:window.control.owner,is_anonymous:false,identities:[{provider:'apple'}]}}},error:null}),
  signInWithIdToken:async()=>{window.control.switches++;window.control.owner='account-b';return {data:{user:{id:'account-b'}},error:null}}
 }};
 export const anonymousOwner=async()=>window.control.owner;
 export async function restoreBackup(state){window.control.reads++;throw Error('Archive unavailable')}
 export async function mirror(state){if(state.backupOwner!==window.control.owner)throw Error('Wrong owner');window.control.uploads++}
 `,
 storage:`export default {getItem:async()=>window.control.disk,setItem:async(_key,value)=>{window.control.disk=value}}`,
 native:`import React from 'react';export const Platform={OS:'ios'};export const View=({children})=><div>{children}</div>;export const Alert={alert:(_title,_body,actions)=>actions.find(a=>a.style==='destructive').onPress()}`,
 apple:`import React from 'react';export const isAvailableAsync=async()=>true;export const AppleAuthenticationButtonType={CONTINUE:0},AppleAuthenticationButtonStyle={WHITE:0};export const AppleAuthenticationButton=({onPress})=><button onClick={onPress}>Continue with Apple</button>;export async function signInAsync(){window.control.appleCalls++;return {identityToken:'synthetic'}}`,
 crypto:`export const randomUUID=()=> 'nonce';export const CryptoDigestAlgorithm={SHA256:0};export const digestStringAsync=async()=> 'digest'`,
 ui:`import React from 'react';export const styles={panel:{},caption:{}};export const Txt=({children})=><div>{children}</div>;export const Action=({label,onPress,disabled})=><button onClick={onPress} disabled={disabled}>{label}</button>`
};
const routes={'./cloud':'cloud','@react-native-async-storage/async-storage':'storage','react-native':'native','expo-apple-authentication':'apple','expo-crypto':'crypto','./ui':'ui'};
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Store,useStore} from './src/store';import {BackupPanel} from './src/BackupPanel';function Probe(){window.store=useStore();return <BackupPanel/>}createRoot(document.getElementById('root')).render(<Store><Probe/></Store>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"','process.env.EXPO_PUBLIC_APPLE_LINK_ENABLED':'"true"'},plugins:[{name:'native-boundaries',setup(b){
 b.onResolve({filter:/.*/},args=>routes[args.path]?{path:routes[args.path],namespace:'mock'}:undefined);
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:mocks[path],loader:'tsx',resolveDir:process.cwd()}));
}}]});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();await page.setContent('<div id="root"></div>');
 await page.evaluate(()=>{window.control={owner:'account-a',appleCalls:0,switches:0,reads:0,uploads:0,disk:JSON.stringify({facts:{practice:'daily'},history:[{id:'local-reading'}],credits:5,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:false,backupOwner:'account-a'})}});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForFunction(()=>window.store?.ready&&window.control.uploads>0);
 const before=await page.evaluate(()=>window.control.disk);
 await page.getByRole('button',{name:'Restore an Apple backup',exact:true}).click();
 await page.getByRole('button',{name:'Continue with Apple',exact:true}).click();
 await page.getByText('Restore could not finish.',{exact:false}).waitFor();
 const failed=await page.evaluate(()=>({owner:window.control.owner,backupOwner:window.store.state.backupOwner,disk:window.control.disk,appleCalls:window.control.appleCalls,reads:window.control.reads}));
 assert.deepEqual(failed,{owner:'account-a',backupOwner:'account-a',disk:before,appleCalls:0,reads:1});
 const uploads=await page.evaluate(()=>{const n=window.control.uploads;window.store.update(s=>({...s,largeText:true}));return n});
 await page.waitForFunction(n=>window.control.uploads>n,uploads);
 console.log('failed restore preserves the existing Apple session, local archive, and future automatic backups: passed');
}finally{await browser.close()}
