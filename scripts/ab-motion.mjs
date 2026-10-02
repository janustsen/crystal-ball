// A/B frame probe under identical host load: 'art' = current, 'plain' = art-pass transitions/veils/float disabled by injected CSS.
// Run: node scripts/ab-motion.mjs (preview on localhost:8099 or AB_URL). Engine replies are a labeled fixture.
import {chromium} from '@playwright/test';import {readFileSync} from 'node:fs';
const plainCss='.motion-enter{animation-name:smoke-wipe!important;animation-timing-function:cubic-bezier(.2,.75,.2,1)!important}.screen-veil::after,.screen-veil::before{display:none!important}.orb .gb{animation:none!important}.tap-burst{display:none!important}.tap-squash{animation:none!important}';
const plan={topic:'general',provided:{},cards:[{id:'context_a',question:'How settled is your plan right now, honestly?',options:['Barely started','Halfway there','Nearly certain','Other'],remember:false}]};
const prediction={id:'ab',question:'Will I be conversational in Spanish in six months?',headline:'By spring you will hold a twenty-minute conversation in Spanish',createdAt:new Date().toISOString(),label:'Speculative · moderate confidence',why:'Fixture.',facts:{},sources:[],assumptions:['Fixture.'],friend:false};
const b=await chromium.launch({channel:'chrome',headless:true,args:['--enable-gpu','--ignore-gpu-blocklist']});
const rows=[];
for(let round=0;round<3;round++)for(const variant of ['art','plain']){
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();
 await p.route('**/engine',async r=>{const a=r.request().postDataJSON()?.action;await r.fulfill({contentType:'application/json',body:JSON.stringify(a==='plan'?{kind:'ok',value:plan}:{kind:'ok',value:{...prediction,id:'ab'+Date.now()}})})});
 await p.goto(process.env.AB_URL||'http://localhost:8099');await p.getByTestId('tab-ask').waitFor();await p.waitForTimeout(2000);
 if(variant==='plain')await p.addStyleTag({content:plainCss});
 await p.evaluate(readFileSync('scripts/measure-motion-browser.js','utf8').replace(/^\(\) => \{/,'(()=>{')+')()');
 const s=(n,id,until)=>p.evaluate(([n,id,until])=>motionAudit.sample(n,id,2200,until),[n,id,until]);
 const out=[];
 if(round===0&&variant==='art')console.log('renderer',await p.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl');const e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL)}));
 const taps=p.evaluate(()=>motionAudit.sample('taps',null,2200));for(const [x,y] of [[39,800],[39,800],[39,800],[39,800],[39,800]]){await p.waitForTimeout(300);await p.mouse.click(x,y)}out.push(await taps);await p.getByTestId('tab-home').click();await p.waitForTimeout(900);
 out.push(await s('approach','hero-orb'));await p.getByTestId('type-instead').click();await p.getByTestId('question-input').fill('Will I be conversational in Spanish?');
 out.push(await s('plan-q1','look-into-the-future','option-0'));out.push(await s('reveal','option-0','why-disclosure'));out.push(await s('share','share-this-glimpse'));out.push(await s('back','close-flow'));out.push(await s('home','close-flow'));
 out.push(await s('history','tab-history'));
 for(const r of out)rows.push({variant,label:r.label,fps:+r.fps.toFixed(1),p95:+r.p95.toFixed(1),max:+r.max.toFixed(1)});
 await c.close();
}
await b.close();
const labels=[...new Set(rows.map(r=>r.label))];
for(const l of labels)for(const v of ['art','plain']){const rs=rows.filter(r=>r.label===l&&r.variant===v);console.log(l.padEnd(9),v.padEnd(6),rs.map(r=>`${r.fps}/${r.max}`).join('  '))}
