import {chromium,expect} from '@playwright/test';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
const url=process.env.VERIFY_URL||'http://localhost:8087',results=[];
await mkdir('.local',{recursive:true});
for(const invalidBirthday of [false,true]){
 const profile=await mkdtemp(`${process.cwd()}/.local/reading-migration-`);
 const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  // A pre-change storage fixture, not a substitute for real engine verification.
  await page.addInitScript(({invalidBirthday})=>{if(!localStorage.getItem('crystal-ball-v1'))localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{level:'Intermediate',...(invalidBirthday?{birthday:'not a date'}:{})},history:[{id:'legacy-forecast',question:'Will I learn Spanish?',headline:'You will speak basic Spanish.',createdAt:'2026-09-01T12:00:00Z',label:'Speculative forecast · not a guarantee',why:'Your regular practice supports this scenario.',facts:{level:'Intermediate'},sources:[],assumptions:['Regular practice continues.'],friend:false}],credits:3,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,largeText:false}));},{invalidBirthday});
  await page.goto(url);await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:'You will speak basic Spanish.'}).click();await page.getByTestId('why-disclosure').click();await expect(page.getByText('Your regular practice supports this scenario.')).toBeVisible();await expect(page.getByTestId('forecast-due-date')).toHaveCount(0);await page.reload();await page.getByTestId('tab-you').click();await expect(page.getByText('Intermediate',{exact:true})).toBeVisible();await expect(page.getByText('Age not shared · teen-safe defaults')).toBeVisible();const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));expect(stored.history).toHaveLength(1);expect(stored.credits).toBe(3);expect(stored.sunSign).toBeNull();expect(stored.ageBand).toBeNull();expect(stored.facts.birthday).toBeUndefined();results.push({legacyFixture:true,invalidBirthday,historyAndCreditsPreserved:true,legacyRevealAndWhyOpened:true});
 }finally{await context.close();}
}
await writeFile('docs/evidence/reading-profile-migration.json',JSON.stringify(results,null,2));console.log('PASS: both legacy storage fixtures preserve history, credits and facts.');
