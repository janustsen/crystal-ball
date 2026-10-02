import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/sky-entry';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await page.goto(base);await page.getByTestId('tab-sky').click();
 const action=page.getByRole('button',{name:'Ask this too',exact:true});await action.waitFor();await page.waitForTimeout(800);
 await page.screenshot({path:`${out}/sky-entry.png`});await writeFile(`${out}/bounds.json`,JSON.stringify(await action.boundingBox(),null,2));
 await expect(action).toBeInViewport({ratio:1});console.log('Sky primary action fully visible without scrolling at 390x844.');
}finally{await browser.close()}
