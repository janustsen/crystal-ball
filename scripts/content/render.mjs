// Renders a day's batch of labeled AI-generated videos from the real web app. Usage and rules: scripts/content/README.md.
import {chromium} from '@playwright/test';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {httpCredentials,previewFetch} from '../preview-auth.mjs';
import {assertSafe,forecasts,profileBirthday,receiptExamples,signs} from './hooks.mjs';
import {assertFollowUpSafe,assertHomeSafe} from './capture-safety.mjs';
import {openEverything,tapToAsk} from '../ladder-seed.mjs';

const {values:opt}=parseArgs({options:{day:{type:'string',default:new Date().toLocaleDateString('en-CA')},a:{type:'string',default:'2'},b:{type:'string',default:'1'},c:{type:'string',default:'2'},out:{type:'string',default:process.env.CONTENT_OUT||'.local/content'}}});
const base=process.env.VERIFY_URL||'http://localhost:8087',out=resolve(opt.out,opt.day),label='AI-generated';
const dayIndex=Math.round(Date.parse(opt.day)/864e5);
// Offset by the batch size; full-list batches repeat the same question order each day.
const pick=(list,n)=>Array.from({length:n},(_,i)=>list[(dayIndex*n+i)%list.length]);
const now=()=>Date.now()/1000,esc=s=>s.replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);

const font=async name=>`data:font/woff2;base64,${(await readFile(`assets/fonts/${name}.woff2`)).toString('base64')}`;
const css=`@font-face{font-family:Fell;src:url(${await font('IMFellEnglish')})}@font-face{font-family:Hanken;src:url(${await font('HankenGrotesk')})}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden;color:#F1E9DC}
.art{position:absolute;inset:0;background-size:cover}.veil{position:absolute;inset:0;background:linear-gradient(rgba(18,14,11,.35),rgba(18,14,11,.7))}
.label{position:absolute;top:168px;left:50%;transform:translateX(-50%);font:600 34px Hanken;background:rgba(18,14,11,.8);border:2px solid rgba(242,194,132,.6);border-radius:40px;padding:10px 26px}
.hook{position:absolute;top:280px;left:60px;right:60px;font:64px/1.2 Fell;text-align:center;white-space:pre-line;text-wrap:balance;background:rgba(18,14,11,.82);border:2px solid rgba(242,194,132,.55);border-radius:32px;padding:30px 40px}
.slide{position:absolute;inset:300px 90px 380px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;text-wrap:balance}
.glyph{font:150px Fell;color:#E0A458}.sign{font:600 44px Hanken;letter-spacing:.2em;text-transform:uppercase;color:#F2C284;margin:10px 0 40px}
.omen{font:76px/1.18 Fell}.title{font:112px/1.05 Fell}.sub{font:44px Hanken;color:#B9AB97;margin-top:36px}
.cta{position:absolute;left:60px;right:60px;bottom:420px;font:60px Fell;text-align:center;background:rgba(18,14,11,.85);border:2px solid rgba(242,194,132,.55);border-radius:32px;padding:26px}`;

let canvas;
async function still(html,path,{opaque=false,label:stamp=label}={}){
 await canvas.setContent(`<style>${css}</style>${html}<div class="label">${stamp}</div>`);
 await canvas.evaluate(()=>document.fonts.ready);
 await canvas.screenshot({path,omitBackground:!opaque});return path;
}

// Device-pixel screencast: Playwright's recordVideo captures CSS pixels, which would upscale a 360×640 phone.
async function record(page,dir){
 const cdp=await page.context().newCDPSession(page),frames=[],writes=[];
 cdp.on('Page.screencastFrame',({data,metadata,sessionId})=>{
  cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
  const file=join(dir,`${String(frames.length).padStart(5,'0')}.jpg`);frames.push({file,t:metadata.timestamp});writes.push(writeFile(file,data,'base64'));
 });
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1080,maxHeight:1920});
 return async()=>{await cdp.send('Page.stopScreencast');await Promise.all(writes);return frames};
}

// Keeps only frames inside the [start,end] windows (cutting the model's thinking time) and burns in [png,from,to] overlays.
// All times are epoch seconds; overlay times map onto the cut timeline.
function encode(frames,windows,overlays,file,dir){
 const spans=windows.toSorted((x,y)=>x[0]-y[0]).reduce((all,[s,e])=>{const last=all.at(-1);if(last&&s<=last[1])last[1]=Math.max(last[1],e);else all.push([s,e]);return all},[]);
 const cut=t=>spans.reduce((sum,[s,e])=>sum+Math.min(Math.max(t-s,0),e-s),0);
 let list='ffconcat version 1.0\n',lastFrame,duration=0;
 for(const [s,e] of spans){
  const inside=frames.filter(f=>f.t>=s&&f.t<=e);
  inside.forEach((f,i)=>{const seconds=((inside[i+1]?.t??e)-f.t).toFixed(4);list+=`file '${f.file}'\nduration ${seconds}\n`;duration+=Number(seconds);lastFrame=f.file});
 }
 if(!list.includes('\nfile '))throw new Error('No frames captured inside the cut windows.');
 list+=`file '${lastFrame}'\n`;
 const listFile=join(dir,'frames.ffconcat');
 return writeFile(listFile,list).then(()=>{
  const graph=overlays.map(([,from,to],i)=>`[v${i}][${i+1}:v]overlay=enable='between(t,${cut(from).toFixed(2)},${cut(to).toFixed(2)})'[v${i+1}]`);
  execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',listFile,...overlays.flatMap(([png])=>['-i',png]),'-filter_complex',[`[0:v]fps=30,scale=1080:1920,setsar=1[v0]`,...graph,`[v${overlays.length}]format=yuv420p[out]`].join(';'),'-map','[out]','-t',String(duration),'-an','-c:v','libx264','-crf','18','-preset','medium','-movflags','+faststart',file],{stdio:'pipe'});
  const [w,h,seconds]=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height:format=duration','-of','csv=p=0:s=,',file],{encoding:'utf8'}).trim().split(/[,\n]/).map(Number);
  if(w!==1080||h!==1920)throw new Error(`Rendered ${w}×${h}, expected 1080×1920.`);
  return Math.round(seconds*10)/10;
 });
}

async function session(browser,{state,clock}={}){
 const context=await browser.newContext({httpCredentials,storageState:state,viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 // Headless Chrome has no microphone; a silent recognizer keeps Ask's real listening screen without a voice-error notice.
 await context.addInitScript(()=>{window.SpeechRecognition=window.webkitSpeechRecognition=class{start(){}stop(){this.onend?.()}}});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 if(clock)await page.clock.setFixedTime(clock);
 return page;
}
const latest=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).history[0]);

// Adult profile through the real onboarding, off camera; each video starts a fresh copy with today's free reading.
async function profile(browser){
 const page=await session(browser);await page.goto(base);
 await page.getByTestId('birthday-month').click();await page.getByTestId('birthday-month').fill(profileBirthday.slice(5,7));
 await page.getByTestId('birthday-day').fill(profileBirthday.slice(8,10));
 await page.getByTestId('birthday-year').fill(profileBirthday.slice(0,4));
 // The app claims the day's omen before inference; snapshotting mid-request would cache an empty omen into every copy.
 const omen=page.waitForResponse(r=>{try{return r.request().postDataJSON()?.action==='omen'}catch{return false}},{timeout:90000});
 await page.getByTestId('continue').click();await page.getByTestId('about-done').click();
 // Home's insight opens with the question ladder; every feature is open, as for a long-time user.
 await openEverything(page);
 await omen;await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crystal-ball-personal-omen-v1')??'{}').text,null,{timeout:10000}); // omenKey in src/daily-omen.ts
 await assertHomeSafe(page);
 const state=await page.context().storageState();await page.context().close();return state;
}

// The real Ask flow against the live engine. Returns event times so the cut can drop waiting.
async function ask(page,question){
 const ev={cards:[]};
 await tapToAsk(page);
 await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').pressSequentially(question,{delay:35});
 await page.getByTestId('look-into-the-future').click();ev.asked=now();
 const next=page.locator('[data-testid="option-0"],[data-testid="record-reveal"],[data-testid="try-again"]').first(),screen=async()=>(await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,300);
 for(let retries=0;;){
  await next.waitFor({timeout:90000}).catch(async error=>{throw new Error(`${error.message.split('\n')[0]} Screen: ${await screen()}`)});
  if(await page.getByTestId('record-reveal').count())break;
  // The app's own Try again after a fail-closed engine reply; retry time falls outside the cut.
  if(await page.getByTestId('try-again').count()){
   if(++retries>2)throw new Error(`Engine failed three times. Screen: ${await screen()}`);
   await page.getByTestId('try-again').click();await page.getByTestId('try-again').waitFor({state:'detached'});continue;
  }
  const shown=now(),card=await page.getByTestId('option-0').elementHandle();
  await assertFollowUpSafe(page);
  await page.waitForTimeout(900);await card.click();ev.cards.push([shown-.3,now()+.4]);
  await page.waitForFunction(el=>!el.isConnected,card,{timeout:90000});
 }
 ev.reveal=now();return ev;
}

async function forecastVideo(browser,state,item,file,dir){
 const hook=assertSafe(item.hook);assertSafe(item.question);
 const page=await session(browser,{state}),stop=await record(page,dir);
 try{
  await page.goto(base);await page.getByTestId('tap-to-ask').waitFor();await assertHomeSafe(page);const start=now()+.3;await page.waitForTimeout(1500);
  const ev=await ask(page,item.question);await page.waitForTimeout(4000);const end=now();
  const reading=await latest(page),frames=await stop();assertSafe(reading.headline);
  const seconds=await encode(frames,[[start,ev.asked+1],...ev.cards,[ev.reveal-1,end]],[[await still(`<div class="hook">${esc(hook)}</div>`,join(dir,'hook.png')),start,ev.reveal-1],[await still('',join(dir,'label.png')),start,end]],file,dir);
  if(seconds<9.5||seconds>15.5)throw new Error(`Format A must run 10–15 s; got ${seconds} s.`);
  return {hook,question:item.question,headline:reading.headline,dueDate:reading.dueDate,seconds};
 }finally{await page.context().close()}
}

async function receiptVideo(browser,state,item,file,dir){
 assertSafe(item.question);
 let page=await session(browser,{state});
 await page.goto(base);await ask(page,item.question);
 const reading=await latest(page),asked=await page.context().storageState();await page.context().close();assertSafe(reading.headline);
 // The app runs at noon on the due date, so History offers the real check-in.
 const due=new Date(`${reading.dueDate}T12:00:00`);
 const hook=assertSafe(item.hook);
 page=await session(browser,{state:asked,clock:due});const stop=await record(page,dir);
 try{
  await page.goto(base);await page.getByTestId('tab-history').waitFor();await assertHomeSafe(page);const start=now()+.3;await page.waitForTimeout(1500);
  await page.getByTestId('tab-history').click();await page.waitForTimeout(1200);
  await page.getByRole('button').filter({hasText:item.question}).first().click();
  const choice=page.getByTestId(`check-in-${item.outcome}`);await choice.waitFor();await page.waitForTimeout(2200);
  await choice.click();await page.waitForTimeout(3000);const end=now(),frames=await stop();
  const seconds=await encode(frames,[[start,end]],[[await still(`<div class="hook">${esc(hook)}</div>`,join(dir,'hook.png'),{label:item.label}),start,end]],file,dir);
  return {hook,label:item.label,question:item.question,headline:reading.headline,dueDate:reading.dueDate,outcome:item.outcome,seconds};
 }finally{await page.context().close()}
}

async function omen(sign){
 for(let attempt=1;;attempt++){
  const result=await previewFetch(`${base}/engine`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts:{sun_sign:sign.sign},viewerBirthday:sign.birthday,localDate:opt.day,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone})}).then(r=>r.json());
  try{if(result?.kind!=='ok')throw new Error(result?.message||'Omen unavailable.');return assertSafe(result.value.text)}catch(error){if(attempt===3)throw new Error(`${sign.sign}: ${error.message}`)}
 }
}

async function omenVideo(browser,state,half,file,dir){
 const group=signs.slice(half*6,half*6+6),omens=[];
 for(const sign of group)omens.push({...sign,text:await omen(sign)});
 // The art is the app's own room with its UI hidden; the last slide is the real Home with today's omen.
 const page=await session(browser,{state});
 let art,app;
 try{
  await page.goto(base);await page.getByTestId('insight-line').click();
  await assertHomeSafe(page);await page.getByTestId('daily-omen').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
  app=(await page.screenshot()).toString('base64');
  if(!await page.locator('[data-testid="app-shell"]>.room').count())throw new Error('Format C requires the .room art layer; no background captured.');
  await page.addStyleTag({content:'[data-testid="app-shell"]>:not(.room){visibility:hidden!important}'});await page.waitForTimeout(500);
  art=(await page.screenshot()).toString('base64');
 }finally{await page.context().close()}
 const bg=`<div class="art" style="background-image:url(data:image/png;base64,${art})"></div><div class="veil"></div>`;
 const slides=[[`${bg}<div class="slide"><div class="title">Today’s omen for each sign</div><div class="sub">${group[0].sign} – ${group.at(-1).sign}</div></div>`,2.2],
  ...omens.map(o=>[`${bg}<div class="slide"><div class="glyph">${o.glyph}&#xFE0E;</div><div class="sign">${o.sign}</div><div class="omen">${esc(o.text)}</div></div>`,2.8]),
  [`<div class="art" style="background-image:url(data:image/png;base64,${app})"></div><div class="cta">Your own omen, daily in Crystal Ball</div>`,3]];
 const frames=[];let t=0;
 for(const [i,[html,seconds]] of slides.entries()){frames.push({file:await still(html,join(dir,`slide-${i}.png`),{opaque:true}),t});t+=seconds}
 const seconds=await encode(frames,[[0,t]],[],file,dir);
 return {slides:slides.length,omens:omens.map(({sign,text})=>({sign,text})),seconds};
}

const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
if(health?.app!=='crystal-ball')throw new Error(`No Crystal Ball engine at ${base}.`);
// Hosted inference needs the viewer's in-app AI consent, which a renderer must not grant on anyone's behalf.
if(health.provider==='hosted')throw new Error('Render against the local engine; the hosted provider requires in-app AI consent.');
await mkdir(out,{recursive:true});
const work=await mkdtemp(join(tmpdir(),'cb-content-'));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const manifest={day:opt.day,base,provider:health.provider,label,videos:[],failures:[]};
try{
 canvas=await (await browser.newContext({viewport:{width:1080,height:1920}})).newPage();
 const state=await profile(browser);
 const jobs=[...pick(forecasts,+opt.a).map((item,i)=>['A',i,item.category,item]),...receiptExamples(dayIndex,+opt.b).map((item,i)=>['B',i,item.category,item]),
  ...Array.from({length:+opt.c},(_,i)=>['C',i,i%2?'libra-pisces':'aries-virgo',i%2])];
 for(const [format,i,slug,item] of jobs){
  const name=`${format}-${String(i+1).padStart(2,'0')}-${slug}.mp4`,dir=await mkdtemp(join(work,'v-'));
  try{
   const render={A:forecastVideo,B:receiptVideo,C:omenVideo}[format];
   manifest.videos.push({file:name,format,...await render(browser,state,item,join(out,name),dir)});console.log(`PASS ${name}`);
  }catch(error){await rm(join(out,name),{force:true});manifest.failures.push({file:name,format,error:String(error)});console.log(`FAIL ${name}: ${error.message}`)}
  finally{await rm(dir,{recursive:true,force:true})}
 }
}finally{
 await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 await browser.close();await rm(work,{recursive:true,force:true});
}
console.log(`${manifest.videos.length} rendered, ${manifest.failures.length} failed → ${out}`);
if(manifest.failures.length)process.exitCode=1;
