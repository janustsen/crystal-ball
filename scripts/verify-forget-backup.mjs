import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

const evidence=process.env.BACKUP_RACE_EVIDENCE||`.local/forget-backup-${Date.now()}`;
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try{
 for(const order of ['forget-first','backup-first']){
  const context=await browser.newContext(),page=await context.newPage();
  try{
   await page.goto(process.env.VERIFY_URL||'http://localhost:8092');
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
   await page.getByTestId('tab-you').click();
   const result=await page.evaluate(async order=>{
    // Exercise the actual Store operations; hold only the external authentication boundary.
    function store(){
     const node=document.querySelector('[data-testid="app-shell"]');
     let fiber=node[Object.keys(node).find(key=>key.startsWith('__reactFiber$'))];
     while(fiber){if(fiber.memoizedProps?.value?.forgetAll)return fiber.memoizedProps.value;fiber=fiber.return;}
     throw new Error('Store context unavailable');
    }
    const settle=()=>new Promise(resolve=>setTimeout(resolve,100));
    store().update(state=>({...state,facts:{current_focus:'private race fixture'}}));await settle();
    const before=store().state.facts;
    let release,started=false,atAuthentication;
    const held=new Promise((_,reject)=>{release=()=>reject(new Error('Synthetic auth cancellation: no remote backup'));});
    const authenticate=async()=>{started=true;atAuthentication=JSON.parse(localStorage.getItem('crystal-ball-v1')).facts;await held;};
    let forgetting,backing,forgetFinished=false;
    if(order==='forget-first'){
     forgetting=store().forgetAll();backing=store().backup('save',authenticate).catch(error=>error.message);
    }else{
     backing=store().backup('save',authenticate).catch(error=>error.message);
     for(let count=0;!started&&count<100;count++)await settle();
     if(!started)throw new Error('Backup did not reach authentication');
     forgetting=store().forgetAll();
    }
    const observedForget=forgetting.then(()=>{forgetFinished=true;});
    await settle();
    const during={facts:store().state.facts,backupBusy:store().backupBusy,forgetFinished};
    release();await Promise.all([observedForget,backing]);await settle();
    return {order,before,atAuthentication,during,after:store().state.facts,stored:JSON.parse(localStorage.getItem('crystal-ball-v1')).facts,ageConfirmed:store().state.ageConfirmed};
   },order);
   results.push(result);
   expect(result.before.current_focus).toBe('private race fixture');
   expect(result.during.backupBusy).toBe(true);
   if(order==='forget-first')expect(result.atAuthentication).toEqual({});
   else{
    expect(result.during.forgetFinished).toBe(false);
    expect(result.during.facts.current_focus).toBe('private race fixture');
   }
   expect(result.after).toEqual({});expect(result.stored).toEqual({});expect(result.ageConfirmed).toBe(true);
   await page.reload();await expect(page.getByTestId('tab-you')).toBeVisible();
   expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).facts)).toEqual({});
  }finally{await context.close();}
 }
 console.log('PASS: forget and backup serialize in both orders; erased facts stay erased after reload. Authentication is held/cancelled; real Supabase persistence is not claimed.');
}finally{await writeFile(`${evidence}/result.json`,JSON.stringify(results,null,2));await browser.close();}
