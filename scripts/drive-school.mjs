import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials,previewSecret} from './preview-auth.mjs';
const base=process.env.SOCIAL_APP_URL||'http://localhost:8095',stamp=Date.now(),sessions=new Map(),evidence=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
async function run(person,script){
 let native=sessions.get(person);
 if(!native){// Owner: synthetic coarse position near Lowell (browser geolocation stub). Others: no permission.
 const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},...(person==='owner'?{geolocation:{latitude:37.7312,longitude:-122.4836},permissions:['geolocation']}:{})});native=await context.newPage();sessions.set(person,native)}
 const page={open:url=>native.goto(url),click:selector=>native.locator(selector).click(),fill:(selector,value)=>native.locator(selector).fill(value),eval:fn=>native.evaluate(fn),wait:(value,timeout=30000)=>typeof value==='number'?native.waitForTimeout(value):native.locator(value).waitFor({timeout})};
 let output='';
 await new Function('page','console',`return (async()=>{${script}})()`)(page,{log:value=>{output+=String(value)}});
 return output;
}
const click=id=>`await page.click('[data-testid="${id}"]');`;
const assert=text=>`if(!(await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(text)}))throw Error('Missing expected school copy');`;
const rpc=`async (name,args={})=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)),session=JSON.parse(localStorage.getItem(key));const response=await fetch('http://127.0.0.1:55329/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:'local-verification-only',Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args)});const data=await response.json();if(!response.ok)throw Error(data.message);return data;}`;
async function choose(person,name='Lowell High School'){
 const locate=person==='stranger'?`${click('find-nearby-schools-once')}await page.wait(3000);${assert('Location is unavailable. Search by name or skip.')}`:person==='owner'?`${click('find-nearby-schools-once')}await page.wait(3000);${assert('Choose your school below.')}if((await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).map(e=>e.textContent).find(t=>t.startsWith('Choose '))))!=='Choose Lowell High School')throw Error('Nearby ranking did not put the closest school first');if(await page.eval(()=>!!document.querySelector('[data-testid="find-nearby-schools-once"]')))throw Error('Location offered twice');`:'';
 await run(person,`await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}await page.wait('[data-testid="choose-my-school"]');${click('choose-my-school')}${locate}await page.fill('[aria-label="Search school name"]','does not exist');${assert('No matching schools.')}await page.fill('[aria-label="Search school name"]',${JSON.stringify(name)});await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent===${JSON.stringify('Choose '+name)}).click());await page.wait('[data-testid="change-school"]');`);
}
try{
 await mkdir('docs/evidence/school',{recursive:true});
 await choose('owner');await choose('friend');await choose('stranger');
 evidence.push({stubbedCoarseLocationNearby:true,locationOfferedOnce:true,deniedLocationFallsBackToSearch:true,webNameSearch:true,missingSchoolFallback:true,explicitSelection:true});
 const baseline=JSON.parse(await run('friend',`console.log(JSON.stringify((await page.eval(()=>(${rpc})('tonights_sky',{my_school:true}))).length));`));
 // Actual AI moderation and SQL publication; no fabricated draft or prediction.
 await run('owner',`await page.eval(async()=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)),session=JSON.parse(localStorage.getItem(key));const response=await fetch('/engine/social',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json','x-preview-token':${JSON.stringify(previewSecret)}},body:JSON.stringify({action:'draft',kind:'star',text:'Will learning something new help me feel ready for exams?'})});const draft=await response.json();if(!response.ok)throw Error(draft.message);await (${rpc})('publish_star',{approved_draft:draft.id});});`);
 await run('friend',`await page.click('[aria-label="My school"]');await page.wait(2000);${assert(`${baseline+1} anonymous school stars today`)}if((await page.eval(()=>document.body.innerText)).includes('sample question'))throw Error('School sky mixed samples with real stars');`);
 await run('stranger',`const result=await page.eval(()=>(${rpc})('school_circle_suggestions'));if(result.length)throw Error('Stranger school discovery');`);
 evidence.push({realAiModeratedStar:true,sameSchoolSky:true,noSampleStarsInSchoolSky:true,noStrangerSuggestions:true});
 const invite=JSON.parse(await run('owner',`${click('social-section-circles')}${click('create-my-circle')}await page.wait('[data-testid="invite-a-friend"]');${click('invite-a-friend')}await page.wait('[data-testid="social-link"]');console.log(JSON.stringify(await page.eval(()=>document.querySelector('[data-testid="social-link"]').textContent)));`));
 await run('friend',`await page.open(${JSON.stringify(invite)});await page.wait('[data-testid="join-this-circle"]');${click('join-this-circle')}await page.wait('[data-testid="leave-this-circle"]');${assert('chose your school.')}if((await page.eval(()=>document.querySelector('[aria-label="Friends can ask about me"]').getAttribute('aria-checked')))==='true')throw Error('Teen consent changed');`);
 await run('friend',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Start a school circle')).click());await page.wait('[data-testid="social-link"]');${assert('They choose whether to join.')}`);
 evidence.push({privateInviteJoined:true,directInviteSchoolSuggestion:true,createSchoolCircleInvite:true,teenConsentRemainsOff:true});
 await run('stranger',`${click('social-section-circles')}${assert('No invited school friends yet.')}`);
 await run('friend',`${click('close-link')}${click('change-school')}await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent==='Choose Abraham Lincoln High School').click());await page.wait('[data-testid="change-school"]');${assert('No invited school friends yet.')}${click('social-section-sky')}await page.click('[aria-label="My school"]');await page.wait(2000);${assert('0 anonymous school stars today')}${click('change-school')}${click('remove-my-school')}await page.wait('[data-testid="choose-my-school"]');await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}await page.wait('[data-testid="choose-my-school"]');`);
 evidence.push({changeSchoolRechecksSkyAndSuggestions:true,removeSchoolPersistsAfterReload:true});
 await run('owner',`${click('close-link')}${click('social-section-sky')}await page.click('[aria-label="My school"]');await page.wait(2000);`);
 await sessions.get('owner').setViewportSize({width:375,height:667});
 await sessions.get('owner').screenshot({path:'docs/evidence/school/sky.png',fullPage:true});
 evidence.push({screenshot:'sky.png',boundary:'Real PostgreSQL and AI moderation; local Auth/PostgREST adapter; browser geolocation is a Playwright stub with fixed synthetic coordinates; no native location claim.'});
 console.log('PASS: school search, same-school sky, invitation-only suggestions, create invite, change/remove and reload');
}catch(error){evidence.push({failure:String(error)});process.exitCode=1;console.error(error)}finally{
 await writeFile(`docs/evidence/school/drive${process.exitCode?'-failed-'+stamp:''}.json`,JSON.stringify(evidence,null,2)+'\n');
 await browser.close();
}
