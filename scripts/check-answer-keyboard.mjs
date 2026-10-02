// A synthetic two-question plan isolates keyboard behavior from model generation.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/answer-keyboard';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/engine',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'ok',value:{topic:'general',provided:{},cards:[{id:'context_a',question:'What matters most to you?',options:['Time','Money','Support','Other'],remember:false},{id:'context_b',question:'What will help you begin?',options:['Practice','A friend','A class','Other'],remember:false}]}})}));
 await page.goto(base);await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I learn pottery this winter?');await page.getByTestId('look-into-the-future').click();
 const option=page.getByTestId('option-0');await option.waitFor();await option.focus();await option.press('Space');
 await expect(page.getByText('What will help you begin?',{exact:true})).toBeVisible({timeout:2000});
 log.push({spaceAdvances:true});await page.screenshot({path:`${out}/answer-space.png`});
}catch(error){log.push({failure:String(error)});process.exitCode=1}finally{await browser.close();await writeFile(`${out}/keyboard.json`,JSON.stringify(log,null,2));console.log(JSON.stringify(log,null,2))}
