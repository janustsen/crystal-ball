// Plus social journey: year recap teaser/unlock, private Circle room toggle, sealed tally, reveal and Circle shelf.
// Same isolated adapter and port setup as drive-social-v2.mjs. Due dates and saved reading years use timing fixtures.
import {spawn,execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=process.env.SOCIAL_APP_URL||'http://localhost:8099',stamp=Date.now(),sessions=new Set(),evidence=[];
const dir=process.env.EVIDENCE_DIR||'docs/evidence/plus-social';
const suffix=stamp.toString(36);
async function run(person,script){
 const session=`cb-plus-${suffix}-${person}`;sessions.add(session);
 console.log('Driving '+person);
 const out=await new Promise((resolve,reject)=>{const p=spawn('chrome-devtools-axi',['run'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session}});let text='';p.stdout.on('data',c=>text+=c);p.stderr.on('data',c=>text+=c);p.on('error',reject);p.on('close',code=>code?reject(Error(text)):resolve(text));p.stdin.end(script)});
 return out.trim()?JSON.parse(out):null;
}
const click=id=>`await page.click('[data-testid="${id}"]');`;
const text=value=>`if(!(await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(value)}))throw Error(${JSON.stringify('Missing '+value)});`;
const absent=value=>`if((await page.eval(()=>document.body.innerText)).includes(${JSON.stringify(value)}))throw Error(${JSON.stringify('Unexpected '+value)});`;
const has=id=>`if(!(await page.eval(()=>!!document.querySelector('[data-testid="${id}"]'))))throw Error('Missing ${id}');`;
const lacks=id=>`if(await page.eval(()=>!!document.querySelector('[data-testid="${id}"]')))throw Error('Unexpected ${id}');`;
const button=prefix=>`await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.startsWith(${JSON.stringify(prefix)})).click());`;
async function fresh(person){
 await run(person,`await page.open(${JSON.stringify(base)});await page.wait('[data-testid="birthday-month"]');await page.fill('[data-testid="birthday-month"]','1995-03-21');${click('continue')}await page.wait('[data-testid="tab-sky"]');${click('tab-sky')}await page.wait('[data-testid="social-section-circles"]');${click('social-section-circles')}await page.wait('[aria-label="Your handle"]');await page.fill('[aria-label="Your handle"]',${JSON.stringify(person+'_'+suffix)});await page.fill('[aria-label="Display name"]',${JSON.stringify(person)});${click('save-social-profile')}await page.wait('[data-testid="search-people"]');`);
 execFileSync('chrome-devtools-axi',['emulate','--viewport','390x844x1,mobile,touch'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-plus-${suffix}-${person}`},stdio:'pipe'});
}
async function circles(person){await run(person,`if(await page.eval(()=>!!document.querySelector('[data-testid="close-flow"]')))${click('close-flow')}${click('tab-home')}${click('tab-sky')}await page.wait('[data-testid="social-section-circles"]');${click('social-section-circles')}await page.wait('[data-testid="search-people"]');await page.wait(1500);`)}
async function history(person){await run(person,`if(await page.eval(()=>!!document.querySelector('[data-testid="close-flow"]')))${click('close-flow')}${click('tab-home')}${click('tab-history')}await page.wait(800);`)}
try{
 await mkdir(dir,{recursive:true});
 await fresh('owner');await fresh('friend');
 await circles('owner');
 await run('owner',`${click('create-my-circle')}await page.wait('[data-testid="invite-a-friend"]');await page.fill('[aria-label="Search handles"]',${JSON.stringify('friend_'+suffix)});${click('search-people')}await page.wait(1200);${button('Invite @friend_')}await page.wait(800);${text('Invitation sent.')}`);
 await circles('friend');
 await run('friend',`${button('Accept @owner_')}await page.wait('[data-testid="leave-this-circle"]');${text('2 of 20 stars')}${lacks('private-room-toggle')}`);
 await circles('owner');
 await run('owner',`${text('Make this a private room · Plus')}await page.fill('[aria-label="Circle question"]','Will we learn a creative skill together?');${click('ask-for-the-circle')}await page.wait('[data-testid="share-circle-forecast-1-reading"]',120000);${click('share-circle-forecast-1-reading')}await page.wait(1500);${text('A forecast is open until its check-in.')}`);
 await history('owner');
 await run('owner',`${has('year-recap')}${has('year-recap-plus')}${absent('Counts only')}${click('year-recap-plus')}await page.wait('[data-testid="continue-with-plus-simulate"]');${click('continue-with-plus-simulate')}await page.wait(1500);${click('close-flow')}`);
 await history('owner');
 await run('owner',`${text('1 reading · 0 golden finds · 0 Yes check-ins')}${text('Counts only · no accuracy score.')}${lacks('year-recap-plus')}`);
 await run('owner',`await page.eval(()=>{const saved=JSON.parse(localStorage.getItem('crystal-ball-v1'));for(const reading of saved.history){const created=new Date(reading.createdAt);created.setFullYear(new Date().getFullYear()-1);reading.createdAt=created.toISOString()}localStorage.setItem('crystal-ball-v1',JSON.stringify(saved))});await page.open(${JSON.stringify(base)});await page.wait('[data-testid="tab-history"]');`);
 await history('owner');
 await run('owner',`${has('year-recap-'+new Date().getFullYear())}${has('year-recap-'+(new Date().getFullYear()-1))}${text('0 readings · 0 golden finds · 0 Yes check-ins')}${text('1 reading · 0 golden finds · 0 Yes check-ins')}`);
 evidence.push({recapTeaserForFree:true,recapUnlockedByPlus:true,pastYearCreatedAtFixture:true,completedYearReachableWithEmptyCurrentYear:true});
 await circles('owner');
 await run('owner',`${click('private-room-toggle')}await page.wait(1500);${text('Private room on.')}${has('private-room-status')}${text('Open the room · show tallies live')}`);
 await circles('friend');
 await run('friend',`${has('private-room-status')}${lacks('private-room-toggle')}`);
 evidence.push({plusOwnerOpensRoom:true,memberSeesRoomWithoutToggle:true});
 // Advance only the due date in this disposable cluster; the forecast text is real model output.
 const pg=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin',port=process.env.SOCIAL_PG_PORT||'55449';
 execFileSync(pg+'/psql',['-X','-v','ON_ERROR_STOP=1','-c',"update public.circle_forecasts set due_date=current_date"],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:port,PGDATABASE:'postgres',PGPASSFILE:fileURLToPath(new URL(`../.local/social-pg-${port}.pgpass`,import.meta.url))},stdio:'pipe'});
 await circles('owner');
 await run('owner',`${has('circle-shelf')}${click('yes')}await page.wait(1500);${has('circle-tally-sealed')}${text('You chose Yes')}${absent('Circle check-in ·')}`);
 await circles('friend');
 await run('friend',`${has('circle-tally-sealed')}${text('Add yours')}${click('not-quite')}await page.wait(1500);${lacks('circle-tally-sealed')}${text('Revealed · Circle check-in · 1 Yes · 1 Not quite · 0 Not yet')}`);
 await circles('owner');
 await run('owner',`${text('Revealed · Circle check-in · 1 Yes · 1 Not quite · 0 Not yet')}await page.eval(()=>document.querySelector('[data-testid="circle-shelf"]').scrollIntoView());`);
 evidence.push({dueDateAdvancedFixture:true,sealedUntilEveryoneVotes:true,ownVoteVisibleWhileSealed:true,revealOnLastVote:true,circleShelf:true});
 // chrome-devtools-axi can misreport a written screenshot path; validate the saved file instead.
 for(const person of ['owner','friend']){
  const path=`${dir}/${person}.png`;
  try{execFileSync('chrome-devtools-axi',['screenshot',path],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-plus-${suffix}-${person}`},stdio:'pipe'})}catch{await sharp(path).metadata();evidence.push({screenshot:person,cliPathReportFailed:true,savedImageValidated:true})}
 }
 console.log('PASS: Plus social browser journey with real SQL and Ollama');
}catch(error){evidence.push({failure:String(error)});console.error(error);process.exitCode=1;
 for(const session of sessions){try{execFileSync('chrome-devtools-axi',['screenshot',`${dir}/failed-${stamp}-${session.split('-').at(-1)}.png`],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session},stdio:'pipe'})}catch{}}
}finally{
 await writeFile(`${dir}/drive${process.exitCode?'-failed-'+stamp:''}.json`,JSON.stringify(evidence,null,2)+'\n');
 for(const session of sessions)try{execFileSync('chrome-devtools-axi',['stop'],{env:{...process.env,CHROME_DEVTOOLS_AXI_SESSION:session},stdio:'pipe'})}catch{}
}
