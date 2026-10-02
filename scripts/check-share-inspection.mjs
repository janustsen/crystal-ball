// Replays a recorded real reading; canvas encoding is held, then failed deliberately.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/share-feedback';await mkdir(out,{recursive:true});
const prediction=JSON.parse(await readFile('docs/ux-loop/round-12/real-drive/drive.json','utf8')).find(row=>row.action==='predict').response.value;
const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await page.addInitScript(prediction=>localStorage.setItem('crystal-ball-v1',JSON.stringify({onboardingDone:true,ageConfirmed:true,facts:{},history:[prediction],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText:false,reduceMotion:true})),prediction);
 await page.goto(base);await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await page.getByTestId('share-this-glimpse').click();await page.getByRole('img').waitFor();await expect(page.getByTestId('export-animated-story')).toHaveCount(0);await page.getByTestId('share-more').click();

 await expect(page.getByTestId('preview-story-card')).toContainText('Tap to enlarge');
 await expect(page.getByRole('img')).toHaveAccessibleName(new RegExp(prediction.headline.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.getByTestId('preview-story-card').focus();await page.keyboard.press('Enter');
 await expect(page.getByTestId('share-image-text')).toHaveText(prediction.headline);
 await expect(page.getByTestId('share-preview-heading')).toBeFocused();
 await page.getByRole('button',{name:'Back to sharing',exact:true}).click();
 await expect(page.getByTestId('preview-story-card')).toBeFocused();
 log.push({passed:true,enlargementLabeled:true,fullHeadlineAccessible:true,keyboardAndFocusReturn:true});
}catch(error){log.push({failure:String(error)});process.exitCode=1}finally{await browser.close();await writeFile(`${out}/inspection.json`,JSON.stringify(log,null,2));console.log(log)}
