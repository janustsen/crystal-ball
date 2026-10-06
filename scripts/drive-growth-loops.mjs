// Isolated Playwright driver for the growth loops: a sealed-link browser visitor's one free web reading,
// the seal-first reveal and the 9:16 reveal clip. Real Ollama readings; no Supabase (in-process web limits),
// so opening the seal itself fails and the visitor takes the "ask your own" path a second claimant would.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {httpCredentials,previewFetch} from './preview-auth.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8131',out='docs/evidence/growth-loops';
await mkdir(out,{recursive:true});
const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
expect(health).toMatchObject({app:'crystal-ball',provider:'ollama'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const log=[{health,boundary:'OS share sheet stubbed (canShare=false) so clips download. Real Ollama readings through the preview bridge; in-process web limits (no Supabase). The seal token is fictional, so opening it fails by design.'}];
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',file],{encoding:'utf8'}));
async function visitor(name){
 const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 // Boundary mock: the OS share sheet is unavailable headless, so the clip takes its download path.
 await context.addInitScript(()=>{navigator.canShare=()=>false});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url()===`${base}/engine`&&r.method()==='POST')requests.push({body:r.postDataJSON(),authorization:!!r.headers().authorization})});
 await page.goto(`${base}/?seal=00000000-0000-4000-8000-000000000001`,{timeout:180000});
 await page.getByTestId('open-sealed-forecast').click();
 await page.getByTestId('web-reading-start').click();
 await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 await page.getByTestId('type-instead').click();
 return {context,page,requests,errors,name};
}
async function ask(page,question){
 await page.getByTestId('question-input').fill(question);await page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3;i++){
  const next=await Promise.race([page.getByTestId('option-0').waitFor({timeout:65000}).then(()=>'card'),page.getByTestId('seal-for-a-friend').waitFor({timeout:65000}).then(()=>'reveal'),page.getByText('Install to ask more.').waitFor({timeout:65000}).then(()=>'install')]);
  if(next!=='card')return next;
  await page.getByRole('radio',{name:'✧ In my own words'}).click();await page.getByTestId('other-input').fill('I practice for an hour every day and have finished half the course.');await page.getByTestId('answer-next').click();
 }
 await page.getByTestId('seal-for-a-friend').waitFor({timeout:65000});return 'reveal';
}
async function clip(page,file){
 const download=page.waitForEvent('download');
 await page.getByTestId('make-reveal-clip').click();
 const saved=`${out}/${file}.${(await download).suggestedFilename().split('.').pop()}`;await (await download).saveAs(saved);
 execFileSync('ffmpeg',['-v','error','-y','-ss','4','-i',saved,'-frames:v','1',`${out}/${file}-4s.png`]);
 execFileSync('ffmpeg',['-v','error','-y','-ss','7.5','-i',saved,'-frames:v','1',`${out}/${file}-end.png`]);
 return {saved,probe:probe(saved)};
}
try{
 const a=await visitor('first-visitor');
 await a.page.screenshot({path:`${out}/01-ask.png`});
 expect(await ask(a.page,'Will I finish my online course next month?')).toBe('reveal');
 const order=await a.page.evaluate(()=>['seal-for-a-friend','share-this-glimpse','make-reveal-clip','record-reveal'].map(id=>{const el=document.querySelector(`[data-testid="${id}"]`);return el?el.getBoundingClientRect().top:null}));
 expect(order.every((top,i)=>top!==null&&(i===0||top>order[i-1]))).toBe(true);
 expect(await a.page.getByTestId('ask-another-question').count()).toBe(0);
 await expect(a.page.getByTestId('open-crystal-ball-app').first()).toBeVisible();
 await a.page.screenshot({path:`${out}/02-reveal.png`,fullPage:true});
 const predict=a.requests.find(r=>r.body.action==='predict');
 expect(predict.body.webReading).toMatchObject({browser:expect.any(String),nonce:expect.any(String)});expect(predict.authorization).toBe(false);
 const plain=await clip(a.page,'clip-question-off');
 await a.page.getByTestId('clip-question').click();
 const withQuestion=await clip(a.page,'clip-question-on');
 for(const c of [plain,withQuestion]){
  const video=c.probe.streams.find(s=>s.codec_type==='video');
  expect(video).toMatchObject({width:1080,height:1920});expect(c.probe.streams.some(s=>s.codec_type==='audio')).toBe(true);
  expect(Number(c.probe.format.duration)).toBeGreaterThan(7);
 }
 // The spent visitor is sent to install instead of a second reading.
 await a.page.getByTestId('close-flow').click();await a.page.getByTestId('tab-ask').click();await a.page.getByTestId('type-instead').click();
 expect(await ask(a.page,'Will I get a new job this year?')).toBe('install');
 await a.page.screenshot({path:`${out}/03-install-after-spent.png`});
 // A fresh browser on the same network is refused by the server.
 const b=await visitor('same-network-visitor');
 expect(await ask(b.page,'Will I move somewhere new this year?')).toBe('install');
 await expect(b.page.getByText('This network has used its free web reading today. Try another network or return tomorrow, or install Crystal Ball to ask more.')).toBeVisible();
 await b.page.screenshot({path:`${out}/04-install-same-network.png`});
 log.push({visitor:a.name,requests:a.requests.map(r=>({action:r.body.action,webReading:!!r.body.webReading,authorization:r.authorization})),clips:[plain,withQuestion],errors:a.errors},{visitor:b.name,requests:b.requests.map(r=>({action:r.body.action,webReading:!!r.body.webReading})),errors:b.errors});
 expect([...a.errors,...b.errors]).toEqual([]);
 log.push({result:'pass'});
}catch(error){log.push({result:'fail',error:String(error?.stack||error)});process.exitCode=1}
finally{await writeFile(`${out}/drive.json`,JSON.stringify(log,null,1));await browser.close()}
