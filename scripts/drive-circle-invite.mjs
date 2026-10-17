import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials} from './preview-auth.mjs';
import {openEverything,openSky} from './ladder-seed.mjs';
// A brand-new invitee (Sky still locked on the ladder) opens a Circle invite straight into Sky: one declines, one joins.
const base=process.env.SOCIAL_APP_URL||'http://localhost:8095',dbUrl=process.env.SOCIAL_DB_URL||'http://127.0.0.1:55329';
const evidenceDir=process.env.EVIDENCE_DIR||'docs/evidence/circle-invite',stamp=Date.now().toString(36),pages=new Map(),evidence=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
async function fresh(person,url=base){
 const context=await browser.newContext({httpCredentials,reducedMotion:'reduce',viewport:{width:390,height:844}}),page=await context.newPage();pages.set(person,page);
 await page.goto(url);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
 if(url===base)await page.getByTestId('tap-to-ask').waitFor({timeout:60000});
 return page;
}
// Closing Sky returns Home, where the ladder still keeps Sky closed below 12 questions.
async function skyStillLocked(page){
 await page.getByTestId('header-back').click();await page.getByTestId('tap-to-ask').waitFor({timeout:30000});
 if(await page.getByTestId('open-sky').count())throw Error('The invite unlocked Sky on the ladder');
 await page.screenshot({path:`${evidenceDir}/home-locked-${[...pages].find(([,value])=>value===page)[0]}.png`});
}
async function setHandle(page,person){
 await page.getByLabel('Your handle').fill(`${person}_${stamp}`);await page.getByLabel('Display name').fill(person);await page.getByTestId('save-social-profile').click();
}
const circles=page=>page.evaluate(async url=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)),session=JSON.parse(localStorage.getItem(key));return (await (await fetch(url,{headers:{apikey:'local-verification-only',Authorization:'Bearer '+session.access_token}})).json()).length},`${dbUrl}/rest/v1/circles?select=id`);
try{
 await mkdir(evidenceDir,{recursive:true});
 const owner=await fresh('owner');await openEverything(owner);await openSky(owner);await owner.getByTestId('social-section-circles').click();
 await setHandle(owner,'owner');await owner.getByTestId('create-my-circle').click();await owner.getByTestId('invite-a-friend').click();
 const invite=(await owner.getByTestId('social-link').textContent()).trim();
 // Decline first: it touches nothing, so the same one-person invitation is still open for the joiner.
 const decliner=await fresh('decliner',invite);
 await decliner.getByTestId('join-this-circle').waitFor({timeout:60000});
 await decliner.getByTestId('join-this-circle').scrollIntoViewIfNeeded();
 await decliner.screenshot({path:`${evidenceDir}/sky-invite.png`});
 await decliner.getByTestId('decline-invitation').click();await decliner.getByTestId('join-this-circle').waitFor({state:'detached'});
 if(new URL(decliner.url()).searchParams.has('circle'))throw Error('Declined invite stayed in the URL');
 await skyStillLocked(decliner);
 evidence.push({newInviteeOpensInviteInSky:true,declineClearsInvite:true,ladderStillLocksSky:true});
 const joiner=await fresh('joiner',invite);
 await joiner.getByTestId('join-this-circle').waitFor({timeout:60000});
 if(!(await joiner.getByTestId('join-this-circle').isDisabled()))throw Error('Join enabled before a handle');
 await setHandle(joiner,'joiner');await joiner.getByTestId('join-this-circle').click({timeout:30000});
 await joiner.getByText('You joined the circle.').waitFor({timeout:30000});await joiner.getByTestId('leave-this-circle').waitFor({timeout:30000});
 if(await circles(joiner)!==1)throw Error('Joiner is not a Circle member');
 await joiner.screenshot({path:`${evidenceDir}/joined.png`});
 await skyStillLocked(joiner);
 evidence.push({joinInSkyWithHandle:true,membershipInDatabase:true,skyStillLocked:true,boundary:'Real PostgreSQL; local Auth/PostgREST adapter.'});
 console.log('PASS: new invitee opens a Circle invite in Sky, declines or joins, and the ladder still locks Sky');
}catch(error){for(const [person,page] of pages)await page.screenshot({path:`${evidenceDir}/failure-${stamp}-${person}.png`,fullPage:true,timeout:10000}).catch(()=>{});evidence.push({failure:String(error)});process.exitCode=1;console.error(error)}finally{
 await writeFile(`${evidenceDir}/drive${process.exitCode?'-failed-'+stamp:''}.json`,JSON.stringify(evidence,null,2)+'\n');
 await browser.close();
}
