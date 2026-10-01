import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const bundle=await build({stdin:{contents:`
 import React from 'react';
 import {createRoot} from 'react-dom/client';
 import {Store,useStore} from './src/store';
 function Probe(){window.store=useStore();return null}
 let root;
 window.mount=()=>{window.store=null;root=createRoot(document.getElementById('root'));root.render(<Store><Probe/></Store>)};
 window.unmount=()=>root.unmount();window.mount();
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'backup-boundaries',setup(b){
 b.onResolve({filter:/^\.\/cloud$/},()=>({path:'cloud',namespace:'boundary'}));
 b.onResolve({filter:/^@react-native-async-storage\/async-storage$/},()=>({path:'storage',namespace:'boundary'}));
 b.onLoad({filter:/.*/,namespace:'boundary'},({path})=>({contents:path==='cloud'?`
 export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'apple-owner',is_anonymous:false}}},error:null})}};
 export async function restoreBackup(state){
  const c=window.control;c.reads++;if(c.failRead)throw Error('Unreadable archive');
  return {...state,...structuredClone(c.archive),backupOwner:'apple-owner'};
 }
 export async function mirror(state){
  const c=window.control;if(!c.online)throw Error('Offline');
  if(state.backupOwner!=='apple-owner')throw Error('Wrong owner');
  c.uploads++;c.archive=structuredClone({facts:state.facts,history:state.history});
 }
 `:`export default {
  getItem:async()=>{const c=window.control;if(c.delay)await new Promise(resolve=>{c.release=resolve});return c.disk},
  setItem:async(key,value)=>{window.control.disk=value}
 };` }));
}}]});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 for(const scenario of ['hydration','fact','everything','fresh','failed-restore','cancel']){
  const page=await browser.newPage();
  try{
   await page.setContent('<div id="root"></div>');
   await page.evaluate(scenario=>{
    const initial={facts:{practice:'daily'},history:[{id:'reading-1'}],credits:5,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:false,backupOwner:'apple-owner'};
    window.control={disk:scenario==='fresh'?null:JSON.stringify(initial),archive:{facts:initial.facts,history:initial.history},online:true,delay:scenario==='hydration',reads:0,uploads:0,auth:0};
   },scenario);
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   if(scenario==='hydration'){
    await page.waitForFunction(()=>!!window.control.release);
    const blocked=await page.evaluate(async()=>{
     const s=window.store,c=window.control;
     s.update(state=>({...state,credits:999}));s.reset();s.forgetAll();s.savePrediction({id:'should-not-save'});
     for(const mode of ['save','restore'])try{await s.backup(mode,async()=>{c.auth++})}catch{}
     return {ready:s.ready,busy:s.backupBusy,auth:c.auth,disk:JSON.parse(c.disk)};
    });
    assert.equal(blocked.ready,false);assert.equal(blocked.busy,true);assert.equal(blocked.auth,0);assert.equal(blocked.disk.credits,5);
    await page.evaluate(()=>{window.control.delay=false;window.control.release()});
   }
   await page.waitForFunction(()=>window.store?.ready&&window.control.disk!==null);
   assert.equal(await page.evaluate(()=>window.control.reads),0);
   if(['fact','everything'].includes(scenario)){
    await page.evaluate(scenario=>{window.control.online=false;if(scenario==='everything')window.store.forgetAll();else window.store.update(s=>({...s,facts:{}}))},scenario);
    await page.waitForFunction(()=>Object.keys(JSON.parse(window.control.disk).facts).length===0);
    await page.evaluate(()=>{window.unmount();window.mount()});
    await page.waitForFunction(()=>window.store?.ready&&Object.keys(window.store.state.facts).length===0);
    const state=await page.evaluate(()=>({state:window.store.state,reads:window.control.reads}));
    assert.equal(state.reads,0);assert.equal(state.state.history.length,scenario==='everything'?0:1);
    await page.evaluate(()=>{window.control.online=true;window.unmount();window.mount()});
    await page.waitForFunction(()=>window.store?.ready&&Object.keys(window.control.archive.facts).length===0);
    assert.equal(await page.evaluate(()=>window.control.archive.history.length),scenario==='everything'?0:1);
   }else if(scenario==='fresh'){
    assert.equal(await page.evaluate(()=>window.control.uploads),0);
    await page.evaluate(()=>window.store.backup('restore',async()=>{window.control.auth++}));
    await page.waitForFunction(()=>window.store.state.history.length===1);
    assert.equal(await page.evaluate(()=>window.store.state.facts.practice),'daily');
   }else if(['failed-restore','cancel'].includes(scenario)){
    const result=await page.evaluate(async scenario=>{
     const c=window.control,before=c.disk;c.failRead=scenario==='failed-restore';
     try{await window.store.backup('restore',async()=>{if(scenario==='cancel')throw Error('Cancelled')})}catch{}
     return {same:before===c.disk};
    },scenario);
    assert.equal(result.same,true);
    await page.waitForFunction(()=>!window.store.backupBusy);
   }
   console.log(`${scenario}: passed`);
  }finally{await page.close()}
 }
}finally{await browser.close()}
