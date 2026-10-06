import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
async function scrollPastBall(page,control,ball){
 await control.evaluate(el=>{
  for(let parent=el.parentElement;parent;parent=parent.parentElement){
   if(['auto','scroll'].includes(getComputedStyle(parent).overflowY)){
    parent.scrollTop=parent.scrollHeight;
    return;
   }
  }
  throw new Error('Missing scroll viewport');
 });
 const bounds=await control.evaluate(el=>{
  for(let parent=el.parentElement;parent;parent=parent.parentElement){
   if(['auto','scroll'].includes(getComputedStyle(parent).overflowY)){
    const rect=parent.getBoundingClientRect();
    return {top:rect.top,height:rect.height};
   }
  }
 });
 const target=await ball.boundingBox();
 assert.ok(bounds.height>0,'scroll viewport remains usable');
 assert.ok(bounds.top>=target.y+target.height,'scrolled controls cannot overlap the ball target');
 await control.click();
}
try{
 for(const failed of [false,true])for(const viewport of [{width:390,height:844},{width:375,height:667}]){
  const context=await browser.newContext({viewport});
  try{
   if(failed)await context.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){
     return kind.includes('webgl')?null:getContext.call(this,kind,...args);
    };
   });
   const page=await context.newPage();
   await page.route('**/room/**/*.mp4',route=>route.fulfill({path:'assets/room/home-idle.mp4',contentType:'video/mp4'}));
   await page.route(`${base}/engine`,route=>route.fulfill({json:{kind:'ok',value:{topic:'general',provided:{},cards:[
    {id:'context_a',question:'How far along are you?',options:['Starting','Halfway','Other'],remember:false},
    {id:'context_b',question:'What can help?',options:['Time','Practice','Other'],remember:false},
   ]}}}));
   await page.goto(base,{timeout:120000});
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
   await page.getByTestId('hero-orb').waitFor();
   await page.waitForTimeout(2500);
   await expect.poll(()=>page.locator('video').count()).toBe(failed?0:1);
   await scrollPastBall(page,page.getByTestId('room-inner-library'),page.getByTestId('hero-orb'));
   await expect(page.getByTestId('hero-orb')).toHaveCount(0);
   await page.getByTestId('tab-home').click();
   await page.getByTestId('hero-orb').click();await page.getByTestId('type-instead').click();
   const input=page.getByTestId('question-input');
   await input.fill('Will I finish my draft?');
   await scrollPastBall(page,input,page.getByTestId('ask-ball'));
   await expect(input).toBeFocused();
   await expect(input).toHaveValue('Will I finish my draft?');
   await page.getByTestId('look-into-the-future').click();
   const other=page.getByTestId('option-2');
   await other.waitFor();await page.waitForTimeout(1000);
   await scrollPastBall(page,other,page.getByTestId('ask-ball'));
   await expect(page.getByTestId('other-input')).toBeVisible();
   if(failed){
    await expect(page.locator('video')).toHaveCount(0);
    await page.getByTestId('close-flow').click();
    await page.getByTestId('close-flow').click();
    for(const tab of ['sky','history','you','home','sky','home']){
     await page.getByTestId(`tab-${tab}`).click();
     await expect(page.locator('video')).toHaveCount(0);
     await expect(page.locator('img[data-room-fade]')).toHaveCount(0);
    }
    await page.setViewportSize({width:360,height:740});
    await expect(page.locator('video')).toHaveCount(0);
   }
   results.push({failed,viewport,status:'passed'});
  }finally{await context.close()}
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
