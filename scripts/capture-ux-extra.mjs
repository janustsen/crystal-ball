import {skipPreviewOnboarding} from './skip-preview-onboarding.mjs';
import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const round=process.argv[2],base=process.env.PREVIEW_URL||'http://localhost:8098';
if(!/^docs\/ux-loop\/round-\d+$/.test(round||''))throw new Error('Pass round path');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(base);await skipPreviewOnboarding(page);await page.getByTestId('hero-orb').click();await page.getByTestId('type-instead').waitFor();await page.waitForTimeout(90);await page.screenshot({path:`${round}/screens/listening-transition.png`});await page.waitForTimeout(600);await page.screenshot({path:`${round}/screens/listening.png`});await page.getByTestId('close-flow').click();await page.getByTestId('tab-sky').click();await page.getByTestId('social-section-circles').click();await page.waitForTimeout(1600);await expect(page.getByTestId('create-my-circle')).toHaveAccessibleName('Create my circle · offline');await expect(page.getByTestId('create-my-circle')).toBeDisabled();await expect(page.getByText('Eligibility unavailable offline.',{exact:true})).toBeVisible();await page.screenshot({path:`${round}/screens/circles-offline.png`});
 await page.getByTestId('tab-you').click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).scrollIntoViewIfNeeded();await page.waitForTimeout(800);await page.screenshot({path:`${round}/screens/settings-controls.png`});
 await page.getByRole('switch',{name:'Large text',exact:true}).click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).scrollIntoViewIfNeeded();await page.waitForTimeout(400);await page.screenshot({path:`${round}/screens/settings-controls-large.png`});
 // Deliberate list-stress fixture, not real readings or a model-quality claim.
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('crystal-ball-v1'));state.largeText=false;state.history=Array.from({length:20},(_,i)=>({id:`stress-${i}`,question:'Will I make time to practise Spanish with a friend every week?',headline:'By spring you may feel more at home in a new conversation.',createdAt:new Date(Date.now()-i*86400000).toISOString(),label:'Speculative · layout fixture',why:'Fixture only',facts:{},sources:[],assumptions:[],friend:false}));localStorage.setItem('crystal-ball-v1',JSON.stringify(state))});
 await page.reload();await page.getByTestId('tab-history').click();await expect(page.getByText('Saved on this device.')).toBeVisible();await page.waitForTimeout(800);await page.screenshot({path:`${round}/screens/history-stress.png`});
 // Fixture readings exercise the real save controls and persistence, not forecast quality.
 await page.getByRole('button').filter({hasText:'By spring you may feel more at home'}).first().click();
 for(const [outcome,label] of [['pending','◷ Not yet'],['no',"Not quite"],['yes','✓ Came true']]){
  await page.getByTestId(`check-in-${outcome}`).click();await expect(page.getByTestId('check-in-status')).toHaveText(`Saved · ${label}`);await page.waitForTimeout(300);await page.screenshot({path:`${round}/screens/outcome-${outcome}-saved.png`});
 }
 await page.reload();await page.getByTestId('tab-history').click();await expect(page.getByText('✓ Came true',{exact:true})).toBeVisible();await page.waitForTimeout(400);await page.screenshot({path:`${round}/screens/history-outcome-persisted.png`});
 await page.evaluate(()=>{const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day,text:'Tonight, the moon hints at a door you have not tried yet.'}))});await page.reload();await page.getByTestId('daily-omen').waitFor();await page.waitForTimeout(600);await page.screenshot({path:`${round}/screens/home-omen-fixture.png`});
 await writeFile(`${round}/outcome-feedback.json`,JSON.stringify({fixture:'Synthetic history item, real save controls and storage',savedStates:['pending','no','yes'],inlineStatus:true,persistsAfterReload:true},null,2));
}finally{await browser.close()}
