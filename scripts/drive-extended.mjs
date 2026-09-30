import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,storageState:'.local/browser-state.json'});
const page=await context.newPage();const events=[];
const shot=async name=>{await page.waitForTimeout(700);await page.screenshot({path:`docs/evidence/${name}.png`});events.push({screen:name,at:new Date().toISOString()});};
try{
 await page.goto((process.env.APP_URL||'http://localhost:8087'));await page.getByTestId('tab-you').click();await page.getByTestId('edit-current_focus').click();await shot('knowledge-edit');await page.getByLabel('Edit current_focus',{exact:true}).fill('Learning & creativity');await page.getByTestId('save-fact').click();
 await page.getByTestId('tab-ask').click();await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});
 for(let i=0;i<2;i++){await shot(`known-question-${i+1}`);await page.getByTestId('option-0').click();const last=(await page.getByTestId('answer-next').innerText()).includes('Reveal');if(last)await context.setOffline(true);await page.getByTestId('answer-next').click();if(last)break}
 await page.getByTestId('try-again').waitFor({timeout:65000});await shot('network-error');await context.setOffline(false);await page.getByTestId('try-again').click();await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});await shot('retry-reveal');
 await page.getByTestId('ask-another-question').click();await page.getByTestId('question-input').fill('What will my net worth be in the future?');await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});
 for(let i=0;i<2;i++){await shot(`money-${i+1}`);await page.getByTestId('option-0').click();const last=(await page.getByTestId('answer-next').innerText()).includes('Reveal');await page.getByTestId('answer-next').click();if(last)break}
 await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});await shot('money-reveal');
 await page.getByTestId('tab-you').click();await page.getByLabel('Large text',{exact:true}).click();await page.getByLabel('Reduce motion',{exact:true}).click();await page.getByTestId('tab-home').click();await page.setViewportSize({width:375,height:667});await shot('large-home');
 await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:'net worth'}).first().click();await shot('large-reveal');
 await page.getByTestId('ask-another-question').click();await page.getByTestId('question-input').fill('Will my project have more users?');await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});await shot('large-question');
 await page.getByTestId('tab-home').click();await context.storageState({path:'.local/browser-state-extended.json'});
 const friend=await context.newPage();await friend.goto('http://localhost:8087/?friend=1&question=Will%20I%20learn%20Spanish%3F');await friend.getByText('For a friend · answers won’t enter your knowledge bank.').waitFor();await friend.screenshot({path:'docs/evidence/friend.png'});
}catch(error){events.push({failure:String(error)});await shot('extended-failure');process.exitCode=1;}finally{await writeFile('docs/evidence/drive-extended.json',JSON.stringify(events,null,2));await browser.close()}
