import {previewSecret} from './preview-auth.mjs';
import {seedLadder} from './ladder-seed.mjs';
// Real Chrome trace + frame/draw counters. No model fixtures; own isolated profile.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {redactEvidence} from './redact-evidence.mjs';
const redact=text=>redactEvidence(text,previewSecret);
const writeEvidence=(name,text)=>writeFileSync(out+'/'+name,redact(text));
const out=process.env.MOTION_EVIDENCE||'docs/evidence/motion-2026-09-30';mkdirSync(out,{recursive:true});mkdirSync('.local',{recursive:true});
const env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:process.env.CHROME_DEVTOOLS_AXI_SESSION||`crystal-ball-motion-${process.pid}`};
const run=promisify(execFile);
const cli=async(...args)=>{try{return (await run('chrome-devtools-axi',args,{env,encoding:'utf8',maxBuffer:4e6,timeout:90000})).stdout}catch(error){throw new Error(redact(String(error.message)))}};
const evaluate=async code=>{const text=await cli('eval',code),line=text.split('\n').find(l=>l.startsWith('result: '));if(!line)throw new Error(text);const value=JSON.parse(line.slice(8));return typeof value==='string'?JSON.parse(value):value};
const sample=async(name,id=null,duration=2200,until=null)=>{const r=await evaluate(`async()=>await motionAudit.sample(${JSON.stringify(name)},${JSON.stringify(id)},${duration},${JSON.stringify(until)})`);console.log(name,r.fps.toFixed(1),'fps; max',r.max.toFixed(1),'ms');return r};
const shot=async name=>{const path=resolve(out,name+'.png');try{await cli('screenshot',path)}catch(error){if(!existsSync(path))throw error}};
const raw=resolve(out,`motion-audit-${Date.now()}.json`);let tracing=false;
// Own the browser so the timing trace can omit continuous screenshot readbacks; AXI still drives every action.
const socket=createServer();await new Promise((resolve,reject)=>socket.once('error',reject).listen(0,'127.0.0.1',resolve));
const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const browser=await chromium.launch({channel:'chrome',headless:true,args:[`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1']});
env.CHROME_DEVTOOLS_AXI_BROWSER_URL=`http://127.0.0.1:${port}`;
const stopTrace=async()=>{tracing=false;await browser.stopTracing()};
try{
 await cli('open',redact(process.env.PREVIEW_URL||'http://localhost:8087'));await cli('emulate','--viewport','390x844x1,mobile,touch');
 await evaluate('async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,2000));return true}');
 await evaluate('()=>{document.querySelector("[data-testid=skip-for-now]")?.click();return true}');
 await evaluate('()=>{document.querySelector("[data-testid=confirm-age]")?.click();return true}');
 await evaluate('()=>{document.querySelector("[data-testid=about-done]")?.click();return true}');
 // Open every ladder feature so Sky, History and You can be sampled, then reload into Home.
 await evaluate(`async()=>{${seedLadder}return true}`);await cli('open',redact(process.env.PREVIEW_URL||'http://localhost:8087'));
 await evaluate('async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,2000));return true}');
 await shot('glass-home');await evaluate(readFileSync('scripts/measure-motion-browser.js','utf8'));
 // Screenshots are captured between samples. Continuous trace screenshots compete with local inference for the GPU.
 writeFileSync(raw,'',{mode:0o600});
 await browser.startTracing(undefined,{path:raw,screenshots:false,categories:['-*', 'blink.console', 'blink.user_timing', 'loading', 'devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'disabled-by-default-devtools.timeline.stack', 'disabled-by-default-devtools.timeline', 'v8.execute', 'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-v8.cpu_profiler.hires']});tracing=true;
 await evaluate('async()=>{await new Promise(r=>setTimeout(r,1200));return true}');
 const idle=await sample('idle-home-glass');if(!idle.glassVisibleThroughout||!idle.draws)throw new Error('Motion audit requires the rendered Home glass ball and measured WebGL draws');await sample('orb-approach-listening','hero-orb');await sample('listening');await shot('listening');await sample('typing','type-instead');await shot('typing');
 await evaluate('()=>{const e=document.querySelector("[data-testid=question-input]");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(e,"Will I be conversational in Spanish in six months?");e.dispatchEvent(new Event("input",{bubbles:true}));return true}');
 await sample('planning-to-question-one','look-into-the-future',2200,'option-0');await shot('first-card');for(let i=0;i<4&&!(await evaluate('()=>!!document.querySelector("[data-testid=share-this-glimpse]")'));i++)await sample('answer-to-followup-or-reveal','option-0',2200,['option-0','share-this-glimpse']);
 await shot('reveal');await sample('share','share-this-glimpse');await shot('share');await sample('return-reveal','close-flow');await sample('return-home','close-flow');
 await sample('sky','open-sky');await shot('sky');await sample('sky-back','header-back');
 for(const tab of ['history','you','home']){await sample(tab+'-tab','tab-'+tab);await shot(tab+'-tab')}
 await sample('tap-to-ask','tap-to-ask');await sample('close-flow','close-flow');await sample('ambient-sky','open-sky',45000);
 const samples=await evaluate('()=>motionAudit.finish()');writeEvidence('samples.json',JSON.stringify({url:await evaluate('()=>location.href'),viewport:{width:390,height:844},samples},null,2)+'\n');
 await stopTrace();const traceSummary='CPU/layout/frame trace captured without screenshot readbacks; AXI drove every action.\n';
 writeEvidence('trace-summary.txt',traceSummary);
 // Keep the raw trace locally; publish a compact timing-only excerpt without network/auth data.
 const rawBytes=readFileSync(raw),trace=JSON.parse(rawBytes);
 // Accept only a complete current trace, including the first and last measured boundaries.
 if(!['idle-home-glass-start','ambient-sky-end'].every(name=>trace.traceEvents.some(e=>e.name===name)))throw new Error('Incomplete motion trace: boundary markers missing');
 tracing=false;
 const names=new Set(['thread_name','process_name','RunTask','FireAnimationFrame','FunctionCall','DrawFrame','BeginFrame','DroppedFrame','Layout','Paint','CompositeLayers']);
 const excerpt={traceEvents:trace.traceEvents.filter(e=>names.has(e.name)||e.cat==='blink.user_timing').map(e=>({...e,args:e.ph==='M'?e.args:{}}))};
 writeFileSync(out+'/timing-trace.json.gz',gzipSync(redact(JSON.stringify(excerpt))));
 writeEvidence('trace-provenance.json',JSON.stringify({rawPath:raw,sha256:createHash('sha256').update(rawBytes).digest('hex'),note:'Published excerpt keeps timing events and marks, omits network and profiler payloads.'},null,2)+'\n');
 // A flight can move the glass out of view; require its visible frame cadence, allowing one boundary frame.
 const failures=samples.filter(s=>{const drawTarget=s.glassVisibleThroughout?58:Math.max(0,Math.min(58,(s.visibleFrames-1)*1000/s.ms));return s.fps<58||s.drawFps<drawTarget||(s.visibleFrames>0&&s.draws===0)||s.p95>20||s.max>50||s.longTasks.length});if(failures.length)throw new Error('Frame budget failed: '+failures.map(s=>s.label).join(', '));
 console.log('All animation samples passed the 60fps callback and visible glass draw targets and 50ms long-frame budget.');
}finally{if(tracing)try{await stopTrace()}catch{};try{await cli('stop')}finally{await browser.close()}}
