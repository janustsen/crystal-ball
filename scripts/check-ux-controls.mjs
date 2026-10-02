import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/ux-controls';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(base);await page.getByTestId('tab-you').click();
 for(const name of ['Ambient sound','Reduce motion','Large text']){
  const control=page.getByRole('switch',{name,exact:true});await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();log.push({name,...box});expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 }
 const large=page.getByRole('switch',{name:'Large text',exact:true});
 await page.getByText('Large text (200%)',{exact:true}).click();await expect(large).toBeChecked();
 await large.focus();await page.keyboard.press('Space');await expect(large).not.toBeChecked();
 await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await page.reload();await page.getByTestId('tab-you').click();await expect(page.getByRole('switch',{name:'Reduce motion',exact:true})).toBeChecked();
 await page.getByTestId('tab-sky').click();await page.getByTestId('social-section-circles').click();await expect(page.getByText('Circles are offline right now.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Create my circle',exact:true})).toBeDisabled();
 await page.screenshot({path:`${out}/circles-offline.png`});
 log.push({labelTap:true,spaceToggle:true,preferencePersists:true,offlineCreationDisabled:true});
}finally{await browser.close();await writeFile(`${out}/controls.json`,JSON.stringify(log,null,2));console.log(JSON.stringify(log,null,2))}
