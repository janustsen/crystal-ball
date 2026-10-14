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
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
   await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
   await page.getByTestId('question-input').fill('What will my life be like next year? '.repeat(4).trim());
   for(const person of [false,true]){
    if(person){await page.getByTestId('ask-about-someone').click();await page.getByTestId('person-name').fill('Alex')}
    for(const open of [false,true]){
     await page.evaluate(value=>window.__keyboard(value),open);await page.waitForTimeout(900);
     const bottom=height-(open?keyboard:0),bad=[];
     const header=await page.getByTestId('close-flow').boundingBox(),viewport=await page.getByTestId('ask-content').boundingBox();
     const ids=[...(person?['person-name','ask-about-myself']:['ask-about-someone']),'question-input','ask-disclosure','speak-instead','look-into-the-future'];
     // A build with an AI provider (EXPO_PUBLIC_AI_PROVIDER_NAME) adds its permission switch and What's shared link.
     const controls=ids.map(id=>[id,page.getByTestId(id)]);
     if(await page.getByTestId('ai-details').count())controls.push(['ai-details',page.getByTestId('ai-details')],['ai-permission',page.getByRole('switch',{name:'Allow AI processing'})]);
     for(const [id,control] of controls){
      await control.scrollIntoViewIfNeeded();
      const bounds=await control.boundingBox();
      const visible=await control.evaluate(e=>{
       for(let n=e;n;n=n.parentElement){const style=getComputedStyle(n);if(style.opacity==='0'||style.visibility==='hidden'||n.getAttribute('aria-hidden')==='true')return false}
       return true;
      });
      if(!visible||!bounds||bounds.width<=0||bounds.height<=0||bounds.x<viewport.x-.5||bounds.x+bounds.width>viewport.x+viewport.width+.5||bounds.y<header.y+header.height-1||bounds.y+bounds.height>bottom+.5)bad.push(`${id} unreachable`);
     }
     const layout=await page.getByTestId('ask-content').evaluate(e=>({height:e.clientHeight,content:e.scrollHeight,offset:e.scrollTop,width:e.clientWidth,contentWidth:e.scrollWidth}));
     if(layout.contentWidth>layout.width+1)bad.push('content overflows horizontally');
     if(layout.content<=layout.height+1&&layout.offset>1)bad.push('fitting content moved');
     const state=`${name}${person?' person':''}${open?' keyboard':''}`;
     console.log(`${bad.length?'FAIL':'PASS'} ${state}${bad.length?`: ${bad.join(', ')}`:''}`);
     if(bad.length)failures.push({state,bad});
     await page.screenshot({path:`${evidence}/${name}${person?'-person':''}${open?'-keyboard':''}.png`});
    }
   }
  }finally{await context.close()}
 }
}finally{await browser.close()}
if(failures.length){console.error(JSON.stringify(failures,null,1));process.exit(1)}
