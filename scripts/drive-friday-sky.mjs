// Friday Sky drive: two browser users at different schools, real Ollama omens through the actual generator.
// Needs the isolated social stack from verify-crystal-ball (SOCIAL_DB_SERVE adapter, engine, Expo web).
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials} from './preview-auth.mjs';
const base=process.env.SOCIAL_APP_URL||'http://localhost:8095',dbUrl=process.env.SOCIAL_DB_URL||'http://127.0.0.1:55329';
const evidenceDir=process.env.EVIDENCE_DIR||'docs/evidence/friday-sky',stamp=Date.now(),evidence=[];
const browser=await chromium.launch({channel:'chrome',headless:true}),pages={};

// The week open right now on a UTC clock; the generator runs as if it were that Saturday.
const shifted=new Date(Date.now()-20*3600e3),opened=new Date(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()-(shifted.getUTCDay()+2)%7));
const week=opened.toISOString().slice(0,10),generatorNow=new Date(opened.getTime()+36*3600e3).toISOString();

async function person(name,school){
 const context=await browser.newContext({httpCredentials,reducedMotion:'reduce',viewport:{width:390,height:844},timezoneId:'UTC'});
 const page=pages[name]=await context.newPage();
 await page.goto(base,{timeout:180000});
 await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 await page.getByTestId('tab-sky').click();await page.getByTestId('choose-my-school').click();
 await page.getByLabel('Search school name').fill(school);
 await page.getByRole('button',{name:`Choose ${school}`,exact:true}).click();
 await page.getByTestId('change-school').waitFor();
 return page;
}
const generate=()=>execFileSync('npx',['tsx','scripts/open-sky.mts',generatorNow],{env:{...process.env,SUPABASE_URL:dbUrl,SUPABASE_SERVICE_ROLE_KEY:'verification-service-only'},encoding:'utf8'});
const omenText=page=>page.getByTestId('sky-omen-school').innerText();
const rpc=(page,name,args={})=>page.evaluate(async([url,name,args])=>{
 const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)),session=JSON.parse(localStorage.getItem(key));
 const response=await fetch(url+name,{method:'POST',headers:{apikey:'local-verification-only',Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args)});
 const data=await response.json();if(!response.ok)throw Error(data.message);return data;
},[dbUrl+'/rest/v1/rpc/',name,args]);

try{
 await mkdir(evidenceDir,{recursive:true});
 const lowell=await person('lowell','Lowell High School'),washington=await person('washington','George Washington High School');
 if(!(await omenText(lowell)).includes('opens Fridays at 8pm'))throw Error('Sky should be closed before this week’s omen exists');
 await lowell.getByTestId('social-section-circles').click();
 await lowell.getByLabel('Your handle').fill(`lowell_${stamp.toString(36)}`);await lowell.getByLabel('Display name').fill('Lowell');
 await lowell.getByTestId('save-social-profile').click();await lowell.getByTestId('create-my-circle').click();
 await lowell.getByTestId('sky-omen-circle-1').waitFor();
 if(!(await lowell.getByTestId('sky-omen-circle-1').innerText()).includes('opens Fridays at 8pm'))throw Error('Circle Sky should start closed');
 if(await lowell.getByTestId('sky-push-toggle').count())throw Error('The native-only push toggle rendered on web');
 evidence.push({week,closedBeforeGeneration:true,webHasNoPushToggle:true});

 const started=Date.now();
 const generated=JSON.parse(generate().trim().split('\n').at(-1));
 // Failed or moderated generations stay closed and retry on the next scheduled run.
 for(let attempt=0;generated.opened<generated.targets&&attempt<3;attempt++){
  const retry=JSON.parse(generate().trim().split('\n').at(-1));
  evidence.push({generationRetry:retry});generated.opened+=retry.opened;
 }
 evidence.push({generator:generated,model:'local Ollama via provider()',seconds:Math.round((Date.now()-started)/1000)});
 if(generated.week!==week||generated.opened<3)throw Error(`Generator did not open both schools and the Circle: ${JSON.stringify(generated)}`);
 const again=JSON.parse(generate().trim().split('\n').at(-1));
 if(again.targets>generated.targets-generated.opened)throw Error('A second run regenerated saved omens');
 evidence.push({secondRunTargets:again.targets,oneOmenPerGroupPerWeek:true});

 for(const page of [lowell,washington]){await page.reload();await page.getByTestId('tab-sky').click();await page.getByTestId('sky-omen-school').waitFor();}
 const mine=await rpc(lowell,'open_sky',{zone:'UTC'}),theirs=await rpc(washington,'open_sky',{zone:'UTC'});
 const lowellSchool=mine.find(o=>o.school_id==='sfusd-lowell'),lowellCircle=mine.find(o=>o.circle_id),washingtonSchool=theirs.find(o=>o.school_id==='sfusd-washington');
 if(!lowellSchool||!lowellCircle||!washingtonSchool||theirs.some(o=>o.school_id==='sfusd-lowell'||o.circle_id)||mine.some(o=>o.school_id==='sfusd-washington'))throw Error('Omen visibility crossed a School or Circle boundary');
 // Different groups can receive identical wording; the RPC IDs above prove isolation.
 const lowellSky=await omenText(lowell),washingtonSky=await omenText(washington);
 if(!lowellSky.includes(lowellSchool.omen))throw Error('Lowell Sky shows the wrong omen');
 if(!washingtonSky.includes(washingtonSchool.omen))throw Error('Washington Sky shows the wrong omen');
 await lowell.screenshot({path:`${evidenceDir}/sky-lowell.png`,fullPage:true});
 await lowell.getByTestId('social-section-circles').click();
 await lowell.getByTestId('sky-omen-circle-1').waitFor();
 if(!(await lowell.getByTestId('sky-omen-circle-1').innerText()).includes(lowellCircle.omen))throw Error('Circle card misses its omen');
 await lowell.getByTestId('sky-omen-circle-1').scrollIntoViewIfNeeded();
 await lowell.screenshot({path:`${evidenceDir}/circle-lowell.png`});
 evidence.push({omens:{lowellSchool:lowellSchool.omen,washingtonSchool:washingtonSchool.omen,lowellCircle:lowellCircle.omen},ownSchoolOnly:true,circleMembersOnly:true,screenshots:['sky-lowell.png','circle-lowell.png']});
 evidence.push({boundary:'Real PostgreSQL RLS and local Ollama; Auth/PostgREST is the verification adapter; the generator clock is set to this open week’s Saturday; native push delivery and the native toggle are not browser-verifiable.'});
 console.log('PASS: Friday Sky closed state, real generation once per group, own-School and own-Circle omens in Sky and Circles');
}catch(error){
 process.exitCode=1;evidence.push({error:String(error)});console.error(error);
 for(const [name,page] of Object.entries(pages))await page.screenshot({path:`${evidenceDir}/failure-${stamp}-${name}.png`,fullPage:true,timeout:10000}).catch(()=>{});
}finally{
 await writeFile(`${evidenceDir}/drive${process.exitCode?'-failed-'+stamp:''}.json`,JSON.stringify(evidence,null,2)+'\n');
 await browser.close();
}
