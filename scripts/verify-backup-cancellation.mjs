import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const bundle=await build({stdin:{contents:`
 import React from 'react';
 import {createRoot} from 'react-dom/client';
 import {Store,useStore} from './src/store';
 function Probe(){window.store=useStore();return null}
 createRoot(document.getElementById('root')).render(<Store><Probe/></Store>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'backup-boundaries',setup(b){
 b.onResolve({filter:/^\.\/cloud$/},()=>({path:'cloud',namespace:'boundary'}));
 b.onResolve({filter:/^@react-native-async-storage\/async-storage$/},()=>({path:'storage',namespace:'boundary'}));
 b.onLoad({filter:/.*/,namespace:'boundary'},({path})=>({contents:path==='cloud'?`
 export const supabase={auth:{getSession:async()=>{
  if(window.control.sessionError)throw Error('Session unavailable');
  return {data:{session:{user:{id:window.control.owner}}},error:null};
 }}};
 export async function restoreBackup(state){if(window.control.restoreError)throw Error('Unreadable archive');return state}
 export async function mirror(state){window.control.mirrors.push(state)}
 `:`export default {getItem:async()=>null,setItem:async(key,value)=>{window.control.local.push(JSON.parse(value))}};` }));
}}]});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 for(const scenario of ['cancel','auth-failure','changed-owner','unknown-owner','unreadable-archive','success','offline-cancel']){
  const page=await browser.newPage();
  try{
   await page.setContent('<div id="root"></div>');
   await page.evaluate(offline=>{window.control={owner:'apple-owner',mirrors:[],local:[],restoreError:offline,sessionError:false}},scenario==='offline-cancel');
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.waitForFunction(()=>window.store?.ready&&window.control.local.length>0);
   const error=await page.evaluate(async scenario=>{
    const c=window.control;
    c.restoreError=scenario==='unreadable-archive';
    try{
     await window.store.backup(async()=>{
      if(scenario==='changed-owner')c.owner='other-owner';
      if(scenario==='unknown-owner')c.sessionError=true;
      if(!['success','unreadable-archive'].includes(scenario))throw Error('Authentication did not finish');
     });
     return null;
    }catch(error){return error.message}
   },scenario);
   assert.equal(error,scenario==='success'?null:scenario==='unreadable-archive'?'Unreadable archive':'Authentication did not finish');
   await page.waitForFunction(()=>!window.store.backupBusy);
   await page.evaluate(()=>window.store.update(s=>({...s,facts:{probe:'after-backup'}})));
   await page.waitForFunction(()=>window.control.local.some(s=>s.facts.probe==='after-backup'));
   const mirrored=await page.evaluate(()=>window.control.mirrors.some(s=>s.facts.probe==='after-backup'));
   assert.equal(mirrored,['cancel','auth-failure','success'].includes(scenario),scenario);
   console.log(`${scenario}: local edits unlocked; automatic mirroring ${mirrored?'preserved':'disabled'}`);
  }finally{await page.close()}
 }
}finally{await browser.close()}
