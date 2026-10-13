import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
const viewportOf=control=>control.evaluate(el=>{
 for(let parent=el.parentElement;parent;parent=parent.parentElement){
  if(parent.dataset.testid==='ask-content'||['auto','scroll'].includes(getComputedStyle(parent).overflowY)){
   const {top,bottom,height}=parent.getBoundingClientRect();return {top,bottom,height};
  }
 }
 throw new Error('Missing scroll viewport');
});
async function dismiss(page,content){
 const action=page.getByTestId('dismiss-notice');
 await action.waitFor();
 const main=await viewportOf(content),notice=await viewportOf(action);
 assert.ok(main.height>=100,'main content retains a usable viewport');
 assert.ok(notice.height>=44,'notice retains space for an action');
 assert.ok(main.bottom<=notice.top,'notice does not overlap the main viewport');
 await action.scrollIntoViewIfNeeded();await expect(action).toBeInViewport({ratio:1});
 await action.click();await expect(action).toHaveCount(0);
}
try{
 for(const height of [390,844])for(const largeText of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height},reducedMotion:'reduce'});
  try{
   await context.addInitScript(largeText=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{current_focus:'Writing my draft'},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,largeText})),largeText);
   const page=await context.newPage();
   await page.route(`${base}/engine`,route=>route.fulfill({json:{kind:'ok',value:{topic:'learning',provided:{},cards:[{id:'practice',question:'How much do you practice?',options:['15 minutes','Other'],remember:false}]}}}));
   await page.goto(base,{timeout:120000});
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
   await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
   await page.getByTestId('ask-about-someone').click();await page.getByTestId('person-name').fill('Alex');
   const input=page.getByTestId('question-input');await input.fill('Will I finish my draft?');
   await page.getByTestId('look-into-the-future').click();
   await expect(page.getByText('Include Alex in your question, or change the first name to match.',{exact:true})).toHaveCount(1);
   await dismiss(page,input);await expect(input).toHaveValue('Will I finish my draft?');
   await input.fill('Will Alex learn Spanish?');await page.getByTestId('look-into-the-future').click();
   await page.getByTestId('option-1').click();
   const other=page.getByTestId('other-input');await other.fill('nonsense');await page.getByTestId('answer-next').click();
   await dismiss(page,other);await expect(other).toHaveValue('nonsense');
   await page.getByTestId('close-flow').click();await page.getByTestId('close-flow').click();
   await page.getByTestId('tab-you').click();await page.getByRole('button',{name:'Forget current_focus',exact:true}).click();
   const undo=page.getByTestId('undo-forget');await undo.scrollIntoViewIfNeeded();await expect(undo).toBeInViewport({ratio:1});await undo.click();
   await dismiss(page,page.getByTestId('edit-current_focus'));
   await expect(page.getByText('Writing my draft',{exact:true})).toHaveCount(1);
   results.push({height,largeText,status:'passed'});
  }finally{await context.close()}
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
