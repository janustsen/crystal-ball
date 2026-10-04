import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.VERIFY_URL||'http://localhost:8104';
const evidence=process.env.RESTORE_REMINDER_EVIDENCE||'.local/restored-reminders';
mkdirSync(evidence,{recursive:true});
const env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-restore-reminders-${Date.now()}`};
try{
 execFileSync('chrome-devtools-axi',['open',base],{env,stdio:'pipe'});
 const output=execFileSync('chrome-devtools-axi',['run'],{env,encoding:'utf8',timeout:90000,input:`
 const click=async id=>page.click('[data-testid="'+id+'"]');
 await click('skip-for-now');await click('confirm-age');
 await page.eval(()=>{
  function store(){const node=document.querySelector('[data-testid=app-shell]');let fiber=node[Object.keys(node).find(k=>k.startsWith('__reactFiber$'))];while(fiber){if(fiber.memoizedProps?.value?.forgetAll)return fiber.memoizedProps.value;fiber=fiber.return}throw Error('Store unavailable')}
  window.reminderTestStore=store;
  const due=new Date();due.setDate(due.getDate()+10);
  const reading={id:'00000000-0000-4000-8000-000000000123',question:'Will I finish my novel?',headline:'You will finish your novel.',createdAt:new Date().toISOString(),dueDate:due.toISOString().slice(0,10),label:'Speculative',why:'Restore regression fixture',facts:{},sources:[],assumptions:[],friend:false};
  window.unansweredBackupReading=reading;
  store().update(s=>({...s,history:[reading]}));
 });
 await page.wait(200);await click('tab-history');
 await page.eval(()=>[...document.querySelectorAll('[role=button]')].find(x=>x.textContent.includes('Will I finish my novel?')).click());
 await click('check-in-pending');await click('share-this-glimpse');await click('share-reminder');
 if(!await page.eval(()=>document.body.innerText.includes('Your check-in is saved.')))throw Error('Answered reading must suppress reminders');
 console.log('PASS answer suppresses reminder');
 // Fixture the older backup payload at the Store boundary; do not claim remote Apple/Supabase restoration.
 await page.eval(()=>window.reminderTestStore().update(s=>({...s,history:[window.unansweredBackupReading]})));
 await page.wait(200);await click('share-reminder');
 const text=await page.eval(()=>document.body.innerText);
 if(!text.includes('Native reminder preview:'))throw Error('Restored unanswered reading is still suppressed: '+text.slice(-650));
 console.log('PASS restoring an unanswered payload through Store reopens reminders without a reload');
 console.log('BOUNDARY: synthetic backup payload; real Store, answer UI and reminder action; native OS delivery and remote backup are not exercised.');
 `});
 writeFileSync(`${evidence}/result.txt`,output);console.log(output);
}catch(error){writeFileSync(`${evidence}/failure.txt`,String(error)+'\n'+(error.stdout||'')+'\n'+(error.stderr||''));throw error}
finally{execFileSync('chrome-devtools-axi',['stop'],{env,stdio:'pipe'})}
