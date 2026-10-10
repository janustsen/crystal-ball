// Core regression drive through the required chrome-devtools-axi boundary.
import {execFile} from 'node:child_process';
import {openAuthenticatedPreview} from './preview-auth.mjs';
import {promisify} from 'node:util';
import {writeFile,rm,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const exec=promisify(execFile),session=`cb-social-core-${Date.now()}`,env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:session};
const evidenceDir=process.env.EVIDENCE_DIR||'docs/evidence';
await mkdir(evidenceDir,{recursive:true});
const evidence=[],base=process.env.SOCIAL_APP_URL||'http://localhost:8095';
async function run(script){
 const {spawn}=await import('node:child_process');
 return await new Promise((resolve,reject)=>{const child=spawn('chrome-devtools-axi',['run'],{env});let out='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>out+=c);child.on('error',reject);child.on('close',code=>code?reject(Error(out)):resolve(out));child.stdin.end(script)});
}
const click=id=>`await page.click('[data-testid="${id}"]');`;
const expect=text=>`if(!(await page.eval(()=>document.body.innerText.replaceAll('\u00a0',' '))).includes(${JSON.stringify(text)}))throw Error(${JSON.stringify(`Missing ${text}`)});`;
const expectForecastHorizon=String.raw`if(!/\b(?:6|six)\s+months\b/i.test(await page.eval(()=>document.querySelector('[data-testid="app-shell"] [aria-live="polite"] > :first-child')?.textContent||'')))throw Error('Forecast missing six-month horizon');`;
async function shot(name){
 const path=resolve(evidenceDir,`social-${name}.png`);await rm(path,{force:true});
 try{await exec('chrome-devtools-axi',['screenshot',path],{env})}catch(error){
  // Firstmate approved accepting a valid saved image when the CLI misreports its path.
  const sharp=(await import('sharp')).default;await sharp(path).metadata();
  evidence.push({screenshot:name,cliPathReportFailed:true,savedImageValidated:true});
 }
}
try{
 openAuthenticatedPreview(base,env);
 await run(`await page.open(${JSON.stringify(base)});await page.wait('[data-testid="birthday-month"]');await page.fill('[data-testid="birthday-month"]','1995-06-15');${click('continue')}await page.wait('[data-testid="tab-ask"]');`);
 await exec('chrome-devtools-axi',['emulate','--viewport','390x844x1,mobile,touch'],{env});
 await run(`${click('tab-sky')}if(!/sample stars/i.test(await page.eval(()=>document.body.innerText)))throw Error('Missing sample label');${click('sky-theme-money')}${click('ask-this-too')}if(!(await page.eval(()=>document.querySelector('[data-testid="question-input"]').value)).includes('savings'))throw Error('Sample prompt not copied');`);
 await run(`await page.fill('[data-testid="question-input"]','Will I be conversational in Spanish in six months?');${click('look-into-the-future')}await page.wait('[data-testid="option-0"]',65000);`);
 const cardCount=JSON.parse(await run(`let count=0;for(;count<2;){const last=(await page.eval(()=>document.body.innerText)).includes((count+1)+' of '+(count+1));${click('option-3')}await page.fill('[data-testid="other-input"]','I am a beginner and practice for thirty minutes every day');${click('answer-next')}count++;if(last)break;await page.wait(800);await page.wait('[data-testid="option-0"]');}console.log(JSON.stringify(count));`));
 await run(`await page.wait('[data-testid="share-this-glimpse"]',65000);${click('why-disclosure')}${expectForecastHorizon}${expect('Behind the mist')}${expect('not a guarantee')}if((await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent))!=='0 readings')throw Error('Credit count');`);
 await shot('core-why');evidence.push({realReading:true,adaptiveCards:cardCount,otherAnswer:true,horizon:true,why:true,exactlyOneCredit:true});
 // Capture the actual browser export without changing its implementation.
 await run(`${click('share-this-glimpse')}await page.eval(()=>{window.__downloads=[];const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__downloads.push({name:this.download,href:this.href});if(!this.download)return click.call(this)}});${click('export-story-card')}await page.wait(1500);`);
 const raw=await run(`console.log(JSON.stringify(await page.eval(()=>window.__downloads.find(d=>d.name.endsWith('.png')))));`),download=JSON.parse(raw);
 if(!download?.href?.startsWith('data:image/png;base64,'))throw Error('No actual PNG export');
 await writeFile(`${evidenceDir}/social-export.png`,Buffer.from(download.href.split(',')[1],'base64'));
 const sharp=(await import('sharp')).default,meta=await sharp(`${evidenceDir}/social-export.png`).metadata();if(meta.width!==1080||meta.height!==1920)throw Error('PNG dimensions');
 await run(`if(await page.eval(()=>!!document.querySelector('[data-testid="export-animated-story"]')))throw Error('Video export still present');await page.eval(()=>{window.__canvasBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null)}});${click('export-story-card')}await page.wait(1200);${expect('The card could not be exported')}await page.eval(()=>{HTMLCanvasElement.prototype.toBlob=window.__canvasBlob});`);
 await shot('export-error');evidence.push({actualPngDimensions:[meta.width,meta.height],shareFailureInjection:'canvas encoding failure',recoveryCopy:true});
 await run(`${click('close-flow')}${click('close-flow')}${click('tab-history')}await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-history"]');${click('tab-history')}await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.includes('Spanish')).click());await page.wait('[data-testid="why-disclosure"]');${expectForecastHorizon}`);
 evidence.push({historyPersistedAndReopened:true});
 await run(`${click('close-flow')}await page.eval(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));s.facts.current_focus='Learning & growth';localStorage.setItem('crystal-ball-v1',JSON.stringify(s));return true});await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-you"]');${click('tab-you')}${click('edit-current_focus')}await page.fill('[aria-label="Edit current_focus"]','Intermediate');${click('save-fact')}${expect('Intermediate')}await page.click('[aria-label="Forget current_focus"]');${expect('Forgot')} ${click('undo-forget')}${expect('Fact restored')}${click('dismiss-notice')}${click('view-plans')}${expect('Test mode')}${click('5-readings-1-99-simulate')}${expect('No payment was taken')}`);
 evidence.push({knowledgeEditedForgottenRestored:true,mockPack:true});
 await run(`${click('close-flow')}${click('tab-ask')}await page.wait('[data-testid="type-instead"]');${click('type-instead')}await page.fill('[data-testid="question-input"]','When will I die?');${click('look-into-the-future')}await page.wait(1000);${expect('This one isn’t for the Ball.')}if(!(await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent)).includes('5 readings'))throw Error('Sensitive question spent credit');`);
 evidence.push({sensitiveRedirect:true,noCreditSpent:true});
 await run(`${click('close-flow')}${click('tab-you')}await page.click('[aria-label="Large text"]');await page.click('[aria-label="Reduce motion"]');${click('tab-sky')}`);
 await exec('chrome-devtools-axi',['emulate','--viewport','375x667x1,mobile,touch'],{env});await shot('sky-large');
 await run(`const tabs=await page.eval(()=>Array.from(document.querySelectorAll('[role="tab"]')).map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}}));if(tabs.length!==5||tabs.some(t=>!t.visible))throw Error('Tab clipping '+JSON.stringify(tabs));${click('social-section-circles')}`);await shot('circles-large');
 evidence.push({phone375x667:true,text200Percent:true,reducedMotion:true,fiveTabsVisible:true});
 console.log('PASS: core UI regression through chrome-devtools-axi');
}catch(error){evidence.push({failure:String(error)});process.exitCode=1;console.error(error);await shot('core-failed').catch(()=>{})}
finally{await writeFile(`${evidenceDir}/social-core-drive.json`,JSON.stringify(evidence,null,2));await exec('chrome-devtools-axi',['stop'],{env}).catch(()=>{});}
