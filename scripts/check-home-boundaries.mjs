import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const base=process.env.PREVIEW_URL||'http://localhost:8087';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
// Home content rests below the ball, leaving it the tap target, and scrolls up beneath the header over it (docs/design/ui-rules.md).
async function checkViewport(page){
 const bounds=await page.getByTestId('room-inner-library').evaluate(el=>{
  for(let parent=el.parentElement;parent;parent=parent.parentElement){
   if(['auto','scroll'].includes(getComputedStyle(parent).overflowY)){
    parent.scrollTop=0;
    const {top,bottom}=parent.getBoundingClientRect(),content=parent.firstElementChild;
    return {top,bottom,content:content.getBoundingClientRect().top+parseFloat(getComputedStyle(content).paddingTop)};
   }
  }
  throw new Error('Missing Home scroll viewport');
 });
 const ball=await page.getByTestId('hero-orb').boundingBox();
 assert.ok(ball&&ball.y+ball.height<=bounds.content,'resting Home content starts below the entire ball target');
 assert.ok(bounds.top<=ball.y,'Home content can scroll up beneath the header over the ball');
 assert.ok(bounds.bottom-bounds.content>=68,'Home retains room for a complete touch target');
 assert.equal(await page.evaluate(({x,y,width,height})=>Boolean(document.elementFromPoint(x+width/2,y+height/2)?.closest('[data-testid="hero-orb"]')),ball),true,'the resting ball receives taps through Home');
}
try{
 for(const viewport of [{width:375,height:667},{width:440,height:956}])for(const largeText of [false,true]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  try{
   await context.addInitScript(largeText=>{
    const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const today=day(0);
    localStorage.setItem('crystal-ball-v1',JSON.stringify({onboardingDone:true,tourSeen:true,ageConfirmed:true,ageBand:'adult',facts:{},history:[],credits:2,plus:false,usage:{day:today,count:0},reduceMotion:true,largeText,ritual:{days:{},stars:[],opened:[day(-2),day(-1)],notify:{daily:false,time:'08:30',offered:day(-3)},counts:{}}}));
    localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day:today,text:'A small step opens a new possibility.'}));
   },largeText);
   const page=await context.newPage();
   await page.goto(base,{timeout:120000});
   await page.getByTestId('today-card').waitFor();
   await checkViewport(page);
   await page.getByTestId('today-questions').click();
   await expect(page.getByTestId('ask-question')).toBeVisible();
   await page.getByTestId('tab-home').click();
   await page.getByTestId('notify-yes').click();
   await expect(page.getByTestId('dismiss-notice')).toBeVisible();
   await checkViewport(page);
   await page.getByTestId('hero-orb').click();
   await expect(page.getByTestId('type-instead')).toBeVisible();
   await page.getByTestId('close-flow').click();
   await page.getByTestId('room-inner-library').click();
   await expect(page.getByTestId('hero-orb')).toHaveCount(0);
   results.push({viewport,largeText,status:'passed'});
  }finally{await context.close()}
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
