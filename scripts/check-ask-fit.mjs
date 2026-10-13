// Typing fits one screen: with a phone keyboard open, the chip, the question in the ball, the mic and Ask the Ball all
// sit between the header and the keyboard, and nothing scrolls. The keyboard is emulated by shrinking the browser's
// visual viewport as iOS Safari does; the native keyboard frame needs a Simulator or device drive.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.ASK_FIT_EVIDENCE||'.local/ask-fit';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),failures=[];
try{
 for(const [width,height,keyboard,large] of [[375,667,260,false],[390,844,336,false],[440,956,346,false],[375,667,260,true],[440,956,346,true]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   if(large)await context.addInitScript(()=>{if(!localStorage.getItem('crystal-ball-v1'))localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:true}))});
   await context.addInitScript(keyboard=>{
    const view=new EventTarget();let open=false;
    Object.defineProperties(view,{height:{get:()=>innerHeight-(open?keyboard:0)},offsetTop:{get:()=>0},width:{get:()=>innerWidth}});
    Object.defineProperty(window,'visualViewport',{get:()=>view});
    window.__keyboard=value=>{open=value;view.dispatchEvent(new Event('resize'))};
   },keyboard);
   const page=await context.newPage(),name=`${width}x${height}${large?'-large':''}`;
   await page.goto(base,{timeout:120000});
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
   await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
   await page.getByTestId('question-input').fill('What will my life be like next year? '.repeat(4).trim());
   for(const open of [false,true]){
    await page.evaluate(value=>window.__keyboard(value),open);await page.waitForTimeout(900);
    const bottom=height-(open?keyboard:0),box=id=>page.getByTestId(id).boundingBox();
    const [close,plans,chip,input,speak,ask]=await Promise.all(['close-flow','view-plans','ask-about-someone','question-input','speak-instead','look-into-the-future'].map(box));
    const overlap=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
    const chipShown=await page.getByTestId('ask-about-someone').evaluate(e=>{for(let n=e;n;n=n.parentElement)if(getComputedStyle(n).opacity==='0')return false;return true});
    // A question longer than the ball holds scrolls inside its own field; the screen itself never scrolls.
    const scrolling=await page.evaluate(()=>[...document.querySelectorAll('[data-testid="app-shell"] *')].filter(e=>e.tagName!=='TEXTAREA'&&e.scrollHeight>e.clientHeight+1&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).length);
    const bad=[
     ...[speak,ask].filter(b=>b.y+b.height>bottom+.5).map(()=>'controls under the keyboard'),
     chip.y<close.y+close.height-1?'chip under the header':'',
     // A chip that stepped aside (no room for the resting ball) no longer bounds the ball, which may then rise between
     // the header's buttons but never under them.
     (chipShown&&input.y<chip.y+chip.height)||[close,plans].some(b=>overlap(b,input))||input.y+input.height>Math.min(speak.y,ask.y)?'question outside the ball band':'',
     scrolling?`${scrolling} scrolling region(s)`:'',
    ].filter(Boolean);
    const state=`${name}${open?' keyboard':''}`;
    console.log(`${bad.length?'FAIL':'PASS'} ${state}${bad.length?`: ${bad.join(', ')}`:''}`);
    if(bad.length)failures.push({state,bad});
    await page.screenshot({path:`${evidence}/${name}${open?'-keyboard':''}.png`});
   }
  }finally{await context.close()}
 }
}finally{await browser.close()}
if(failures.length){console.error(JSON.stringify(failures,null,1));process.exit(1)}
