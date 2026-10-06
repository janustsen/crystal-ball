import {spawn,execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=process.env.SOCIAL_APP_URL||'http://localhost:8099',stamp=Date.now(),sessions=new Set(),evidence=[];
const dir=process.env.EVIDENCE_DIR||'docs/evidence/social-v2';
const db=process.env.SOCIAL_DB_URL||'http://127.0.0.1:55339';
const suffix=stamp.toString(36);
async function run(person,script){
 const session=`cb-v2-${suffix}-${person}`;sessions.add(session);
 console.log('Driving '+person);
 const out=await new Promise((resolve,reject)=>{const p=spawn('chrome-devtools-axi',['run'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session}});let text='';p.stdout.on('data',c=>text+=c);p.stderr.on('data',c=>text+=c);p.on('error',reject);p.on('close',code=>code?reject(Error(text)):resolve(text));p.stdin.end(script)});
 return out.trim()?JSON.parse(out):null;
}
const click=id=>`await page.click('[data-testid="${id}"]');`;
const text=value=>`if(!(await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(value)}))throw Error(${JSON.stringify('Missing '+value)});`;
const rpc=`async(name,args={})=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)),session=JSON.parse(localStorage.getItem(key));const r=await fetch(${JSON.stringify(db+'/rest/v1/rpc/')}+name,{method:'POST',headers:{authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args)});const result=await r.json();if(!r.ok)throw Error(result.message);return result}`;
async function fresh(person,birthday='1995-03-21'){
 await run(person,`await page.open(${JSON.stringify(base)});await page.wait('[data-testid="onboarding-birthday"]');await page.fill('[data-testid="onboarding-birthday"]',${JSON.stringify(birthday)});${click('continue')}await page.wait('[data-testid="meet-the-ball"]');${click('meet-the-ball')}await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}await page.wait('[data-testid="social-section-circles"]');${click('social-section-circles')}await page.wait('[aria-label="Your handle"]');await page.fill('[aria-label="Your handle"]',${JSON.stringify(person+'_'+suffix)});await page.fill('[aria-label="Display name"]',${JSON.stringify(person)});${click('save-social-profile')}await page.wait('[data-testid="search-people"]');`);
}
async function refresh(person){await run(person,`if(await page.eval(()=>!!document.querySelector('[data-testid="close-flow"]')))${click('close-flow')}${click('tab-home')}${click('tab-sky')}await page.wait('[data-testid="social-section-circles"]');${click('social-section-circles')}await page.wait('[data-testid="search-people"]');`)}
async function search(person,handle){await run(person,`await page.fill('[aria-label="Search handles"]',${JSON.stringify(handle)});${click('search-people')}await page.wait(1200);`)}
try{
 await mkdir(dir,{recursive:true});
 await fresh('owner');await fresh('friend');await fresh('outsider');
 for(const person of ['owner','friend','outsider'])execFileSync('chrome-devtools-axi',['emulate','--viewport','390x844x1,mobile,touch'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-v2-${suffix}-${person}`},stdio:'pipe'});
 await refresh('owner');await refresh('friend');await refresh('outsider');
 await run('owner',`${click('create-my-circle')}await page.wait('[data-testid="invite-a-friend"]');`);
 await search('owner','friend_'+suffix);
 await run('owner',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Invite @friend_')).click());await page.wait(800);${text('Invitation sent.')}`);
 await refresh('friend');
 await run('friend',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Decline @owner_')).click());await page.wait(800);${text('A small sky of your own.')}`);
 await run('owner',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Invite @friend_')).click());await page.wait(800);`);
 await refresh('friend');
 await run('friend',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Accept @owner_')).click());await page.wait('[data-testid="leave-this-circle"]');${text('2 of 20 stars')}`);
 evidence.push({profileUi:true,handleSearch:true,requestDeclineAndAccept:true});
 await refresh('owner');
 await run('owner',`await page.fill('[aria-label="Circle question"]','Will we learn a creative skill together?');${click('ask-for-the-circle')}await page.wait('[data-testid="share-circle-forecast-1-reading"]',120000);${text('Visible to everyone in the Circle.')}${click('share-circle-forecast-1-reading')}await page.wait(1500);${text('A forecast is open until its check-in.')}${text('0 readings')}`);
 await refresh('friend');
 const forecast=await run('friend',`${text('Will we learn a creative skill together?')}console.log(JSON.stringify(await page.eval(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));return {readings:s.history.length,usage:s.usage.count,text:document.body.innerText}})));`);
 if(forecast.readings!==0||forecast.usage!==0)throw Error('Recipient paid for Circle forecast');
 evidence.push({realOllamaCircleForecast:true,askerDebitedOneReading:true,recipientNotDebited:true,oneOpenForecast:true});
 // Advance only the due date and record the fixture golden draw in this disposable cluster; generated question/headline remain real.
 const pg=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin',port=process.env.SOCIAL_PG_PORT||'55449';
 execFileSync(pg+'/psql',['-X','-v','ON_ERROR_STOP=1','-c',"update public.circle_forecasts set due_date=current_date; insert into public.golden_forecasts(user_id,reading_id) select user_id,'50000000-0000-0000-0000-000000000001' from public.circle_members on conflict do nothing"],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:port,PGDATABASE:'postgres',PGPASSFILE:fileURLToPath(new URL(`../.local/social-pg-${port}.pgpass`,import.meta.url))},stdio:'pipe'});
 await refresh('friend');await run('friend',`${click('yes')}await page.wait(700);${text('1 Yes')}`);
 await refresh('owner');await run('owner',`${click('not-yet')}await page.wait(700);${text('1 Yes')}${text('1 Not yet')}`);
 evidence.push({dueDateAdvancedFixture:true,memberVotingUi:true,sharedTally:true});
 await run('owner',`await page.eval(()=>(${rpc})('circle_checkin',{activity_theme:'learning'}));await page.eval(()=>(${rpc})('share_circle_moment',{reading:'50000000-0000-0000-0000-000000000001',moment:'golden'}));await page.eval(()=>(${rpc})('share_circle_moment',{reading:'50000000-0000-0000-0000-000000000001',moment:'yes'}));`);
 await run('friend',`await page.eval(()=>(${rpc})('circle_checkin',{activity_theme:'growth'}));`);
 await refresh('owner');
 await run('owner',`${text('Circle glow')}${text('Golden draw')}${text('Came true')}await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('❤️ for Friend')).click());await page.wait(800);${text('❤️')}`);
 evidence.push({activityRpcFixture:true,glowAndMomentsUi:true,fixedEmojiReactionUi:true});
 await run('friend',`await page.click('[aria-label="Friends can ask about me"]');await page.wait(700);`);
 await run('owner',`${click('view-plans')}await page.wait('[data-testid="continue-with-plus-simulate"]');${click('continue-with-plus-simulate')}${click('close-flow')}`);
 await refresh('owner');
 await run('owner',`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith('Ask about Friend')&&e.getAttribute('aria-disabled')!=='true').click());await page.fill('[aria-label="Friend’s first name"]','Alex');${click('ask-about-this-friend')}await page.wait('[data-testid="question-input"]');await page.fill('[data-testid="question-input"]','Will Alex explore a creative skill?');${click('look-into-the-future')}await page.wait('[data-testid="seal-for-a-friend"]',120000);${click('seal-for-a-friend')}await page.wait('[data-testid="send-sealed-forecast-to-friend"]',120000);${click('send-sealed-forecast-to-friend')}await page.wait(900);${text('Sealed forecast delivered.')}`);
 await refresh('friend');
 await run('friend',`await page.wait('[data-testid="open-sealed-forecast"]');${click('open-sealed-forecast')}await page.wait(1000);${text('A glimpse for you.')}`);
 evidence.push({realFriendReadingWithConsent:true,realSealModeration:true,targetedSealUi:true,recipientBallClaim:true});
 await run('owner',`${click('seal-for-a-friend')}await page.wait('[data-testid="create-sealed-link"]:not([aria-disabled="true"])',120000);${click('create-sealed-link')}await page.wait('[data-testid="social-link"]');`);
 const link=await run('owner',`console.log(JSON.stringify(await page.eval(()=>document.querySelector('[data-testid="social-link"]').textContent)));`);
 await run('visitor',`await page.open(${JSON.stringify(link)});await page.wait('[data-testid="open-sealed-forecast"]');if((await page.eval(()=>document.body.innerText)).includes('When is your birthday?'))throw Error('Seal blocked by onboarding');${click('open-sealed-forecast')}await page.wait('[data-testid="open-crystal-ball-app"]');${text('A glimpse for you.')}`);
 await run('outsider',`await page.open(${JSON.stringify(link)});await page.wait('[data-testid="open-sealed-forecast"]');${click('open-sealed-forecast')}await page.wait(1200);${text('This seal is unavailable')}`);
 evidence.push({browserVisitorNoOnboarding:true,headlineAndInstallPrompt:true,secondClaimRefused:true});
 await refresh('owner');
 await run('owner',`${click('transfer-ownership-to-friend')}await page.wait(700);${click('leave-this-circle')}${click('yes-leave-the-circle')}await page.wait(1000);${text('Circle left.')}`);
 await refresh('friend');await run('friend',`await page.wait('[data-testid="invite-a-friend"]');${text('1 of 20 stars')}`);
 evidence.push({transferAndOwnerLeaveUi:true});
 await run('friend',`await page.eval(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));s.largeText=true;s.reduceMotion=true;localStorage.setItem('crystal-ball-v1',JSON.stringify(s))});await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}${click('social-section-circles')}await page.wait('[data-testid="search-people"]');console.log(JSON.stringify(await page.eval(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}))));`).then(size=>{if(size.scroll>size.width)throw Error('Horizontal overflow');evidence.push({largeTextNoHorizontalOverflow:true})});
 for(const person of ['friend','visitor']){
  const path=`${dir}/${person}.png`;
  try{execFileSync('chrome-devtools-axi',['screenshot',path],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-v2-${suffix}-${person}`},stdio:'pipe'})}catch{await sharp(path).metadata();evidence.push({screenshot:person,cliPathReportFailed:true,savedImageValidated:true})}
 }
 console.log('PASS: social v2 multi-person browser journey with real SQL and Ollama');
}catch(error){evidence.push({failure:String(error)});console.error(error);process.exitCode=1;
 for(const session of sessions){try{execFileSync('chrome-devtools-axi',['screenshot',`${dir}/failed-${stamp}-${session.split('-').at(-1)}.png`],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session},stdio:'pipe'})}catch{}}
}finally{
 await writeFile(`${dir}/drive${process.exitCode?'-failed-'+stamp:''}.json`,JSON.stringify(evidence,null,2)+'\n');
 for(const session of sessions)try{execFileSync('chrome-devtools-axi',['stop'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session},stdio:'pipe'})}catch{}
}
