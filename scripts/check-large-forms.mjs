// Synthetic planning response and reduced viewport simulate layout constraints, not a native keyboard.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/large-forms';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText:true,reduceMotion:true})));
 const page=await context.newPage();
 await page.route('**/engine',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(route.request().postDataJSON()?.action==='plan'?{kind:'ok',value:{topic:'general',provided:{},cards:[{id:'context_a',question:'What matters most to you?',options:['Time','Money','Support','Other'],remember:false}]}}:{kind:'error',message:'Synthetic layout boundary.'})}));
 await page.goto(base);await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I start learning pottery this winter?');
 await page.setViewportSize({width:390,height:500});await page.getByTestId('look-into-the-future').scrollIntoViewIfNeeded();await expect(page.getByTestId('look-into-the-future')).toBeInViewport({ratio:1});await page.screenshot({path:`${out}/typing-constrained-viewport.png`});
 await page.setViewportSize({width:390,height:844});await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-3').click();await expect(page.getByTestId('option-0')).toHaveCount(0);await expect(page.getByText('What matters most to you?',{exact:true})).toBeInViewport();
 await page.getByTestId('other-input').fill('A steady creative practice');await page.screenshot({path:`${out}/custom-answer-context.png`});
 await page.setViewportSize({width:390,height:500});await page.getByTestId('answer-next').scrollIntoViewIfNeeded();await expect(page.getByTestId('answer-next')).toBeInViewport({ratio:1});expect(await page.getByTestId('other-input').inputValue()).toBe('A steady creative practice');await page.screenshot({path:`${out}/custom-constrained-viewport.png`});
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Choose a different answer',exact:true}).click();await expect(page.getByTestId('option-0')).toBeVisible();await page.getByTestId('option-3').click();await expect(page.getByTestId('other-input')).toHaveValue('A steady creative practice');
 log.push({normalViewport:'390x844',constrainedViewport:'390x500',largeText:'200%',submitReachable:true,customContextVisible:true,otherAnswerRetained:true,boundary:'Viewport resize is synthetic; native keyboard and VoiceOver remain unverified.'});
}finally{await browser.close();await writeFile(`${out}/large-forms.json`,JSON.stringify(log,null,2));console.log(JSON.stringify(log))}
