// Isolated Playwright recording driver, allowed by verify-crystal-ball. No video export in the app.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {httpCredentials,previewFetch} from './preview-auth.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8112',out='docs/evidence/positioning';
await mkdir(out,{recursive:true});await mkdir('.local/positioning-video',{recursive:true});
const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
expect(health).toMatchObject({app:'crystal-ball',provider:'ollama'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const samples=[
 {name:'01-writing',question:'Will I finish my novel this year?',answer:'I write for one hour daily and have finished half a draft.'},
 {name:'02-learning',question:'Will I be conversational in Spanish in six months?',answer:'I am a beginner, practice thirty minutes daily, and speak with a tutor weekly.'},
 {name:'03-golden',question:'Will I finish my painting project this month?',answer:'I paint every weekend and have finished two of three planned pieces.',golden:true},
],log=[{health,boundary:'Fictional sample inputs; real Ollama readings. Golden edition forced for sample 3, cosmetic only. Browser recording, not app export.'}];
try{
 for(const sample of samples){
  const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'.local/positioning-video',size:{width:390,height:844}}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const replies=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(r.url()===`${base}/engine`&&r.request().method()==='POST')try{replies.push({action:r.request().postDataJSON().action,response:await r.json()})}catch{}});
  try{
   await page.goto(base);await expect(page.getByText('Your forecast. Then check back.',{exact:true})).toBeVisible();
   if(sample===samples[0])await page.screenshot({path:`${out}/onboarding.png`});
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
   await expect(page.getByText('Your forecast. Then check back.',{exact:true})).toBeVisible();
   if(sample===samples[0]){
    await page.screenshot({path:`${out}/home.png`});
    await page.getByTestId('view-plans').click();
    await expect(page.getByText(/Free includes 1 reading a day/)).toBeVisible();
    await expect(page.getByText(/Prototype only: no charge/)).toBeAttached();
    await page.getByTestId('continue-with-plus-simulate').click();
    await page.getByTestId('turn-off-simulated-plus').click();
    await expect(page.getByText('Simulated Plus is off. No subscription or payment to cancel.')).toBeVisible();
    await page.screenshot({path:`${out}/paywall.png`});
    await page.getByTestId('dismiss-notice').click();await page.getByTestId('close-flow').click();
   }
   await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
   await page.getByTestId('question-input').fill(sample.question);await page.getByTestId('look-into-the-future').click();
   for(let i=0;i<3;i++){
    await page.getByTestId('option-0').waitFor({timeout:65000});
    const body=await page.locator('body').innerText(),last=body.includes(`${i+1} of ${i+1}`);
    await page.getByRole('radio',{name:'✧ In my own words'}).click();await page.getByTestId('other-input').fill(sample.answer);await page.getByTestId('answer-next').click();
    if(last)break;
   }
   await page.getByTestId('record-reveal').waitFor({timeout:65000});
   await expect(page.getByTestId('forecast-due-date')).toContainText('Check back');
   await expect(page.getByTestId('view-plans')).toHaveText('0 readings');
   await page.screenshot({path:`${out}/${sample.name}-reveal.png`});
   await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
   await page.getByRole('button').filter({hasText:sample.question}).click();
   for(const [id,label] of [['yes','Yes'],['no','Not quite'],['pending','Not yet']]){
    await page.getByTestId(`check-in-${id}`).click();
    await expect(page.getByTestId(`check-in-${id}`)).toHaveText(`✓ ${label}`);
    await page.getByTestId('dismiss-notice').click();
   }
   await page.getByTestId('check-in-no').click();await page.getByTestId('dismiss-notice').click();
   await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
   await expect(page.getByText('Not quite',{exact:true})).toBeVisible();
   await page.reload();await page.getByTestId('tab-history').click();await expect(page.getByText('Not quite',{exact:true})).toBeVisible();
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
   const reading=state.history[0];log.push({sample:sample.name,reading,replies});
   if(sample.golden){await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));s.history[0].golden=true;localStorage.setItem('crystal-ball-v1',JSON.stringify(s));});await page.reload();await page.getByTestId('tab-history').click();}
   await page.getByRole('button').filter({hasText:sample.question}).click();
   await page.getByTestId('why-disclosure').click();
   await page.getByTestId('share-this-glimpse').click();
   if(sample===samples[0]){
    const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();await(await download).saveAs(`${out}/share-card.png`);
    await page.getByTestId('dismiss-notice').click();
   }
   const before=replies.filter(r=>r.action==='predict').length;
   await page.getByTestId('share-record-reveal').click();
   await page.getByTestId('capture-reveal').waitFor();
   expect(await page.locator('body').innerText()).not.toContain(sample.question);
   expect(await page.locator('body').innerText()).not.toContain(sample.answer);
   await expect(page.getByTestId('why-disclosure')).toHaveCount(0);
   await expect(page.getByTestId('view-plans')).toHaveCount(0);
   if(sample.golden)await expect(page.getByText('Golden edition · same uncertainty')).toBeVisible();
   const box=await page.getByTestId('capture-reveal').boundingBox();expect(Math.abs(box.width/box.height-9/16)).toBeLessThan(.001);
   expect(await page.locator('.orb .gb').evaluate(el=>getComputedStyle(el).position)).not.toBe('static');
   await page.waitForTimeout(2000);await page.getByTestId('replay-capture').click();await page.waitForTimeout(11000);
   await page.screenshot({path:`${out}/${sample.name}-capture.png`});
   expect(replies.filter(r=>r.action==='predict').length).toBe(before);expect(errors).toEqual([]);
   const raw=await page.video().path();await context.close();
   // Trim only the clean replay, crop its 9:16 frame, and upscale for posting.
   execFileSync('ffmpeg',['-y','-sseof','-11','-i',raw,'-vf',`crop=${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(box.x)}:${Math.round(box.y)},scale=1080:1920,setsar=1`,'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${sample.name}.mp4`],{stdio:'pipe'});
   console.log(`PASS ${sample.name}: real reveal, equal outcomes, privacy-safe replay, zero extra prediction calls; 1080×1920 recording.`);
  }catch(error){await page.screenshot({path:`${out}/${sample.name}-failure.png`}).catch(()=>{});log.push({sample:sample.name,failure:String(error),replies,errors});await context.close();throw error;}
 }
}finally{await writeFile(`${out}/drive.json`,JSON.stringify(log,null,2));await browser.close();}
