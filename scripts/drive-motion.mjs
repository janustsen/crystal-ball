import {openAuthenticatedPreview,previewSecret} from './preview-auth.mjs';
// Real Chrome trace + frame/draw counters. No model fixtures; own isolated profile.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {redactEvidence} from './redact-evidence.mjs';
const redact=text=>redactEvidence(text,previewSecret);
const writeEvidence=(name,text)=>writeFileSync(out+'/'+name,redact(text));
const out=process.env.MOTION_EVIDENCE||'docs/evidence/motion-2026-09-30';mkdirSync(out,{recursive:true});mkdirSync('.local',{recursive:true});
const env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:process.env.CHROME_DEVTOOLS_AXI_SESSION||`crystal-ball-motion-${process.pid}`};
const cli=(...args)=>{try{return execFileSync('chrome-devtools-axi',args,{env,encoding:'utf8',maxBuffer:4e6,timeout:90000})}catch(error){throw new Error(redact(String(error.message)))}};
const evaluate=code=>{const text=cli('eval',code),line=text.split('\n').find(l=>l.startsWith('result: '));if(!line)throw new Error(text);const value=JSON.parse(line.slice(8));return typeof value==='string'?JSON.parse(value):value};
const sample=(name,id=null,duration=2200,until=null)=>{const r=evaluate(`async()=>await motionAudit.sample(${JSON.stringify(name)},${JSON.stringify(id)},${duration},${JSON.stringify(until)})`);console.log(name,r.fps.toFixed(1),'fps; max',r.max.toFixed(1),'ms');return r};
const shot=name=>{const path=resolve(out,name+'.png');try{cli('screenshot',path)}catch(error){if(!existsSync(path))throw error}};
const raw=resolve(`.local/motion-audit-${Date.now()}.json`);let tracing=false;
try{
 openAuthenticatedPreview(process.env.PREVIEW_URL||'http://localhost:8087',env);
 cli('open',redact(process.env.PREVIEW_URL||'http://localhost:8087'));cli('emulate','--viewport','390x844x1,mobile,touch');
 evaluate('async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,2000));return true}');
 evaluate('()=>{document.querySelector("[data-testid=skip-for-now]")?.click();return true}');
 evaluate('()=>{document.querySelector("[data-testid=confirm-age]")?.click();return true}');
 shot('fog-home');evaluate(readFileSync('scripts/measure-motion-browser.js','utf8'));
 cli('perf-start','--no-reload','--no-auto-stop','--file',raw);tracing=true;
 evaluate('async()=>{await new Promise(r=>setTimeout(r,1200));return true}');
 sample('idle-both-orbs');sample('orb-approach-listening','hero-orb');sample('listening','speak-question');sample('typing','type-instead');
 evaluate('()=>{const e=document.querySelector("[data-testid=question-input]");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(e,"Will I be conversational in Spanish in six months?");e.dispatchEvent(new Event("input",{bubbles:true}));return true}');
 sample('planning-to-question-one','look-into-the-future',2200,'option-0');const total=evaluate('()=>Number(document.body.innerText.match(/1 of (\\d)/)[1])');for(let i=0;i<total;i++){sample('select-answer-'+(i+1),'option-0',500);sample(i===total-1?'thinking-to-reveal':'question-two','answer-next',2200,i===total-1?'share-this-glimpse':'option-0');}
 sample('share','share-this-glimpse');sample('return-reveal','close-flow');sample('return-home','close-flow');
 for(const tab of ['sky','history','you'])sample(tab+'-tab','tab-'+tab);
 sample('ask-tab','tab-ask');sample('close-flow','close-flow');sample('ambient-sky',null,45000);
 const samples=evaluate('()=>motionAudit.finish()');writeEvidence('samples.json',JSON.stringify({url:evaluate('()=>location.href'),viewport:{width:390,height:844},samples},null,2)+'\n');
 let traceSummary;try{traceSummary=cli('perf-stop','--file',raw)}catch(error){traceSummary=`AXI trace export returned an error; checking the completed artifact: ${String(error)}\n`;}
 writeEvidence('trace-summary.txt',traceSummary);
 // Keep the raw trace locally; publish a compact timing-only excerpt without network/auth data.
 const rawBytes=readFileSync(raw),trace=JSON.parse(rawBytes);
 // The bridge can time out after writing its file; accept only a complete current trace.
 if(!trace.traceEvents.some(e=>e.name==='ambient-sky-end'))throw new Error('Incomplete motion trace: final ambient marker missing');
 tracing=false;
 const names=new Set(['thread_name','process_name','RunTask','FireAnimationFrame','FunctionCall','DrawFrame','BeginFrame','DroppedFrame','Layout','Paint','CompositeLayers']);
 const excerpt={traceEvents:trace.traceEvents.filter(e=>names.has(e.name)||e.cat==='blink.user_timing').map(e=>({...e,args:e.ph==='M'?e.args:{}}))};
 writeFileSync(out+'/timing-trace.json.gz',gzipSync(redact(JSON.stringify(excerpt))));
 writeEvidence('trace-provenance.json',JSON.stringify({rawPath:raw,sha256:createHash('sha256').update(rawBytes).digest('hex'),note:'Published excerpt keeps timing events and marks, omits network and profiler payloads.'},null,2)+'\n');
 const failures=samples.filter(s=>s.fps<58||!(s.shaderFps>=58)||s.p95>20||s.max>50||s.longTasks.length);if(failures.length)throw new Error('Frame budget failed: '+failures.map(s=>s.label).join(', '));
 console.log('All animation samples passed the 60fps callback and fog draw targets and 50ms long-frame budget.');
}finally{if(tracing)try{cli('perf-stop','--file',raw)}catch{};cli('stop')}
