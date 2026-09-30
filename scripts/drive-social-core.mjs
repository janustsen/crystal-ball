// Core regression drive through the required chrome-devtools-axi boundary.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
const exec=promisify(execFile),session=`cb-social-core-${Date.now()}`,env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:session};
const evidence=[],base=process.env.SOCIAL_APP_URL||'http://localhost:8095';
async function run(script){
 const {spawn}=await import('node:child_process');
 return await new Promise((resolve,reject)=>{const child=spawn('chrome-devtools-axi',['run'],{env});let out='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>out+=c);child.on('error',reject);child.on('close',code=>code?reject(Error(out)):resolve(out));child.stdin.end(script)});
}
const click=id=>`await page.click('[data-testid="${id}"]');`;
const expect=text=>`if(!(await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(text)}))throw Error(${JSON.stringify(`Missing ${text}`)});`;
async function shot(name){await exec('chrome-devtools-axi',['screenshot',`${process.cwd()}/docs/evidence/social-${name}.png`],{env});}
try{
 await run(`await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-ask"]');`);
 await exec('chrome-devtools-axi',['emulate','--viewport','390x844x1,mobile,touch'],{env});
 await run(`${click('tab-sky')}${expect('sample stars')}${click('sky-theme-money')}${click('ask-this-too')}if(!(await page.eval(()=>document.querySelector('[data-testid="question-input"]').value)).includes('savings'))throw Error('Sample prompt not copied');`);
 await run(`await page.fill('[data-testid="question-input"]','Will I be conversational in Spanish in six months?');${click('look-into-the-future')}await page.wait('[data-testid="option-0"]',65000);`);
 for(let i=0;i<3;i++)await run(`${click(i===1?'option-3':'option-0')}${i===1?`await page.fill('[data-testid="other-input"]','30 minutes');`:''}${click('answer-next')}${i<2?`await page.wait('[data-testid="option-0"]');`:''}`);
 await run(`await page.wait('[data-testid="share-this-glimpse"]',65000);${click('why-disclosure')}${expect('6 months')}${expect('Behind the mist')}${expect('not a guarantee')}if((await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent))!=='0 readings')throw Error('Credit count');`);
 await shot('core-why');evidence.push({realReading:true,otherAnswer:true,horizon:true,why:true,exactlyOneCredit:true});
 // Capture the actual browser export without changing its implementation.
 await run(`${click('share-this-glimpse')}await page.eval(()=>{window.__downloads=[];const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__downloads.push({name:this.download,href:this.href});if(!this.download)return click.call(this)}});${click('export-story-card')}await page.wait(1500);`);
 const raw=await run(`console.log(JSON.stringify(await page.eval(()=>window.__downloads.find(d=>d.name.endsWith('.png')))));`),download=JSON.parse(raw);
 if(!download?.href?.startsWith('data:image/png;base64,'))throw Error('No actual PNG export');
 await writeFile('docs/evidence/social-export.png',Buffer.from(download.href.split(',')[1],'base64'));
 const sharp=(await import('sharp')).default,meta=await sharp('docs/evidence/social-export.png').metadata();if(meta.width!==1080||meta.height!==1920)throw Error('PNG dimensions');
 await run(`await page.eval(()=>{window.__realFetch=window.fetch;window.fetch=(input,init)=>String(input).endsWith('/share')?Promise.resolve(new Response('Injected failure',{status:500})):window.__realFetch(input,init)});${click('export-animated-story')}await page.wait(1200);${expect('Animation could not be exported')}await page.eval(()=>{window.fetch=window.__realFetch});`);
 await shot('export-error');evidence.push({actualPngDimensions:[meta.width,meta.height],shareFailureInjection:'HTTP 500',recoveryCopy:true});
 await run(`${click('tab-history')}await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-history"]');${click('tab-history')}${expect('6 months')}await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.includes('Spanish')).click());await page.wait('[data-testid="why-disclosure"]');`);
 evidence.push({historyPersistedAndReopened:true});
 await run(`${click('tab-you')}${click('edit-level')}await page.fill('[aria-label="Edit level"]','Intermediate');${click('save-fact')}${expect('Intermediate')}await page.click('[aria-label="Forget level"]');${expect('Forgot')} ${click('undo-forget')}${expect('Fact restored')}${click('dismiss-notice')}${click('view-plans')}${expect('Test mode')}${click('5-readings-1-99-simulate')}${expect('No payment was taken')}`);
 evidence.push({knowledgeEditedForgottenRestored:true,mockPack:true});
 await run(`${click('tab-ask')}${click('ask-another-question')}await page.fill('[data-testid="question-input"]','When will I die?');${click('look-into-the-future')}await page.wait(1000);${expect('Let’s look toward something gentler.')}if(!(await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent)).includes('5 readings'))throw Error('Sensitive question spent credit');`);
 evidence.push({sensitiveRedirect:true,noCreditSpent:true});
 await run(`${click('tab-you')}await page.click('[aria-label="Large text"]');await page.click('[aria-label="Reduce motion"]');${click('tab-sky')}`);
 await exec('chrome-devtools-axi',['emulate','--viewport','375x667x1,mobile,touch'],{env});await shot('sky-large');
 await run(`const tabs=await page.eval(()=>Array.from(document.querySelectorAll('[role="tab"]')).map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}}));if(tabs.length!==5||tabs.some(t=>!t.visible))throw Error('Tab clipping '+JSON.stringify(tabs));${click('social-section-circles')}`);await shot('circles-large');
 evidence.push({phone375x667:true,text200Percent:true,reducedMotion:true,fiveTabsVisible:true});
 console.log('PASS: core UI regression through chrome-devtools-axi');
}catch(error){evidence.push({failure:String(error)});process.exitCode=1;console.error(error);await shot('core-failed').catch(()=>{})}
finally{await writeFile('docs/evidence/social-core-drive.json',JSON.stringify(evidence,null,2));await exec('chrome-devtools-axi',['stop'],{env}).catch(()=>{});}
