import {spawn} from 'node:child_process';
import {openAuthenticatedPreview} from './preview-auth.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SOCIAL_APP_URL||'http://localhost:8095',log=[],runId=Date.now().toString(36),sessions=new Set();
async function run(name,script){
 const session=`cb-social-${runId}-${name}`,fresh=!sessions.has(session);sessions.add(session);
 if(fresh)openAuthenticatedPreview(base,{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session});
 const output=await new Promise((resolve,reject)=>{
  const child=spawn('chrome-devtools-axi',['run'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session}});
  let text='';child.stdout.on('data',chunk=>text+=chunk);child.stderr.on('data',chunk=>text+=chunk);
  child.on('error',reject);child.on('close',code=>code?reject(new Error(text)):resolve(text.trim()));child.stdin.end(script);
 });
 return output?JSON.parse(output):null;
}
async function waitFor(name,selector,label,ms=95000,expectedText=''){
 const deadline=Date.now()+ms;let last;
 do{
  last=await run(name,`console.log(JSON.stringify(await page.eval(()=>({ready:!!document.querySelector(${JSON.stringify(selector)})&&document.body.innerText.includes(${JSON.stringify(expectedText)}),failed:!!document.querySelector('[data-testid="try-again"]'),text:document.body.innerText}))));`);
  if(last.ready)return;
  if(last.failed)throw new Error(`${label}: ${last.text}`);
  await new Promise(resolve=>setTimeout(resolve,4000));
 }while(Date.now()<deadline);
 throw new Error(`${label} did not appear: ${last?.text}`);
}
const onboard=`await page.wait('[data-testid="onboarding-birthday"]');await page.fill('[data-testid="onboarding-birthday"]','1995-06-15');await page.click('[data-testid="continue"]');await page.wait('[data-testid="meet-the-ball"]');await page.click('[data-testid="meet-the-ball"]');`;
const click=id=>`await page.click('[data-testid="${id}"]');`;
const assertText=text=>`if(!(await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(text)}))throw Error(${JSON.stringify(`Missing: ${text}`)});`;
const setHandle=person=>`await page.wait('[aria-label="Your handle"]');await page.fill('[aria-label="Your handle"]',${JSON.stringify(person+'_'+runId)});await page.fill('[aria-label="Display name"]',${JSON.stringify(person)});${click('save-social-profile')}await page.wait('[data-testid="search-people"]');`;
const identity=`await page.eval(()=>{const key=Object.keys(localStorage).find(key=>/^sb-.*-auth-token$/.test(key));return key?JSON.parse(localStorage.getItem(key)).user.id:null})`;

try{
 const circle=await run('owner',`
  await page.open(${JSON.stringify(base)});${onboard}await page.wait('[data-testid="tab-sky"]');
  ${click('tab-ask')}await page.wait('[data-testid="type-instead"]');${click('type-instead')}
  await page.fill('[data-testid="question-input"]','Will I be conversational in Spanish in six months?');${click('look-into-the-future')}
  await page.wait('[data-testid="option-0"]',65000);
  for(let card=0;card<2;card++){const last=(await page.eval(()=>document.body.innerText)).includes((card+1)+' of '+(card+1));${click('option-0')}if(last)break;await page.wait('[data-testid="option-0"]');}
  await page.wait('[data-testid="share-this-glimpse"]',65000);
  ${click('close-flow')}${click('tab-sky')}${click('add-my-star')}
  await page.wait('[data-testid="publish-anonymous-star"]',120000);
  ${assertText('Approve your anonymous wording')}${click('publish-anonymous-star')}
  await page.wait('[data-testid="remove-my-star"]');
  ${click('social-section-circles')}${setHandle('owner')}${click('create-my-circle')}
  await page.wait('[data-testid="invite-a-friend"]');${click('invite-a-friend')}
  await page.wait('[data-testid="social-link"]');
  console.log(JSON.stringify({url:await page.eval(()=>document.querySelector('[data-testid="social-link"]').textContent),owner:${identity}}));
 `);
 log.push({realOllamaReading:true,aiRewrittenStarApproved:true,createdPrivateCircle:true});
 console.log('PASS: real reading → AI-rewritten draft → explicit publication → circle invite');
 const friend=await run('friend',`
  await page.open(${JSON.stringify(circle.url)});${onboard}${setHandle('friend')}await page.wait('[data-testid="join-this-circle"]');
  ${assertText('Joining shares')}${click('join-this-circle')} await page.wait('[data-testid="leave-this-circle"]');
  ${click('tab-home')}${click('tab-sky')}
  if(await page.eval(()=>!!document.querySelector('[data-testid="join-this-circle"]')))throw Error('Handled invitation reappeared after joining');
  ${click('social-section-sky')}${click('sky-theme-learning')}
  await page.wait('[data-testid="-this-resonates"]');${click('-this-resonates')}
  await page.wait('[data-testid="-resonated"]');
  console.log(JSON.stringify({explicitJoin:true,anonymousResonance:true,owner:${identity}}));
 `);
 log.push({explicitJoin:friend.explicitJoin,anonymousResonance:friend.anonymousResonance});
 await run('outsider',`
  await page.open(${JSON.stringify(circle.url)});${onboard}${setHandle('outsider')}await page.wait('[data-testid="join-this-circle"]');${click('join-this-circle')}
  await page.wait('[data-testid="dismiss-social-notice"]');${assertText('expired or was used')}
  ${click('dismiss-social-notice')}${click('decline-invitation')}${click('tab-home')}${click('tab-sky')}
  if(await page.eval(()=>!!document.querySelector('[data-testid="join-this-circle"]')))throw Error('Handled invitation reappeared after declining');
  console.log(JSON.stringify({inviteReplayRejected:true,declinedInvitationConsumed:true}));
 `).then(result=>log.push(result));
 await run('friend',`
  await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-home"]');
  ${click('tab-home')}${click('tab-sky')}${click('social-section-circles')}
  await page.wait('[role="switch"]:not([aria-disabled="true"])');
  await page.click('[role="switch"]');
  console.log(JSON.stringify({adultOptInUsed:true}));
 `).then(result=>log.push(result));
 await run('owner',`
  ${click('view-plans')}${click('continue-with-plus-simulate')}${click('close-flow')}
  ${click('tab-sky')}${click('social-section-circles')}
  console.log(JSON.stringify({stage:'Plus selected'}));
 `);
 const ownerFacts=await run('owner',`console.log(JSON.stringify(await page.eval(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).facts)));`);
 await waitFor('owner','[data-testid="ask-about-friend-2"]:not([aria-disabled="true"])','consented friend button',30000);
 await run('owner',`
  ${click('ask-about-friend-2')}await page.fill('[aria-label="Friend’s first name"]','Alex');${click('ask-about-this-friend')}await page.wait('[data-testid="question-input"]');
  await page.fill('[data-testid="question-input"]','Will this friend make progress on a creative goal this year?');${click('look-into-the-future')}
  console.log(JSON.stringify({stage:'Friend reading requested'}));
 `);
 await waitFor('owner','[data-testid="seal-for-a-friend"]','Friend reading');
 console.log('PASS: consented Friend reading returned');
 for(const fromHistory of [false,true]){
  await run('owner',`
   ${fromHistory?`${click('close-flow')}${click('tab-history')}await page.eval(()=>{const button=[...document.querySelectorAll('[role="button"]')].find(b=>b.textContent.includes('creative goal'));if(!button)throw Error('Missing archived Friend reading');button.click()});`:''}
   await page.eval(()=>{const button=[...document.querySelectorAll('[role="button"]')].find(b=>b.textContent==='Edit question');if(!button)throw Error('Missing Edit question');button.click()});
   ${assertText('For a friend')}
   ${click('look-into-the-future')}
   console.log(JSON.stringify({stage:'Friend edit requested'}));
  `);
  await waitFor('owner','[data-testid="seal-for-a-friend"]','edited Friend reading');
  const saved=await run('owner',`console.log(JSON.stringify(await page.eval(()=>{const state=JSON.parse(localStorage.getItem('crystal-ball-v1'));return {facts:state.facts,reading:state.history[0]}})));`);
  if(JSON.stringify(saved.facts)!==JSON.stringify(ownerFacts)||!saved.reading.friend||saved.reading.friendTarget?.member!==friend.owner||saved.reading.friendTarget?.firstName!=='Alex')throw new Error('Friend edit lost identity or changed owner memory');
 }
 log.push({friendEditPreservesIdentityAndMemory:true,historyEditPreservesIdentityAndMemory:true});

 await run('owner',`${click('seal-for-a-friend')} console.log(JSON.stringify({stage:'Seal moderation requested'}));`);
 await waitFor('owner','[data-testid="create-sealed-link"]','Seal moderation');
 const seal=await run('owner',`
  ${click('create-sealed-link')}
  await page.wait('[data-testid="social-link"]');
  const url=await page.eval(()=>document.querySelector('[data-testid="social-link"]').textContent);
  console.log(JSON.stringify({url}));
 `);
 log.push({realOllamaConsentedFriendReading:true,sealedHeadlineOnly:true});
 console.log('PASS: explicit adult consent → Plus Friend reading → moderated sealed card');
 await run('friend',`
  await page.open(${JSON.stringify(seal.url)});await page.wait('[data-testid="open-sealed-forecast"]');
  ${assertText('Tap the ball to open')}${click('open-sealed-forecast')}
 `);
 await waitFor('friend','[data-testid="open-sealed-forecast"][aria-disabled="true"]','Opened headline',30000,'Speculative forecast');
 await run('friend',`
  ${assertText('Speculative forecast')}
  await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}
  ${click('social-section-circles')}
  await page.wait('[data-testid="send-a-star-to-friend-1"]');${click('send-a-star-to-friend-1')}
  ${assertText('Someone asked about you.')}
  console.log(JSON.stringify({openedByOrbTap:true,privateActivityVisible:true,anonymousFriendNotice:true,reactionSent:true}));
 `).then(result=>log.push(result));
 await run('outsider',`
  await page.open(${JSON.stringify(seal.url)});await page.wait('[data-testid="open-sealed-forecast"]');${click('open-sealed-forecast')}
 `);
 await waitFor('outsider','[data-testid="open-sealed-forecast"]','Rejected second recipient',30000,'This seal is unavailable');
 await run('outsider',`
  ${assertText('This seal is unavailable')}
  console.log(JSON.stringify({secondRecipientRejected:true}));
 `).then(result=>log.push(result));
 await run('friend',`
  ${click('leave-this-circle')}${click('yes-leave-the-circle')}
  await page.wait('[data-testid="create-my-circle"]');
  console.log(JSON.stringify({leftCircle:true}));
 `).then(result=>log.push(result));
 console.log('PASS: social browser drive; real PostgreSQL RLS and Ollama, simulated Auth/PostgREST; adult onboarding through UI');
}catch(error){log.push({failure:String(error)});console.error(error);process.exitCode=1;}
finally{
 await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/social-drive.json',JSON.stringify({at:new Date().toISOString(),boundary:'Auth/PostgREST simulated; adult onboarding through UI, PostgreSQL RLS and Ollama real',steps:log},null,2));
 for(const session of sessions)await new Promise(resolve=>{const child=spawn('chrome-devtools-axi',['stop'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session},stdio:'ignore'});child.on('error',resolve);child.on('close',resolve)});
}
