import {skipPreviewOnboarding} from './skip-preview-onboarding.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {measureTextContrast} from './measure-text-contrast.mjs';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/reading-contrast';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),samples=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.addInitScript(()=>{const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day,text:'Tonight, the moon whispers kindness to all who listen gently.'}))});
 await page.goto(base);await skipPreviewOnboarding(page);await page.getByTestId('hero-orb').waitFor();
 for(const screen of ['home','you','history','sky','plans','ask']){
  if(screen==='plans')await page.getByTestId('view-plans').click();else if(screen==='ask'){await page.getByTestId('close-flow').click();await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click()}else await page.getByTestId('tab-'+screen).click();
  await page.waitForTimeout(1400);
  for(let phase=0;phase<3;phase++){samples.push({screen,phase,text:await measureTextContrast(page,`${out}/${screen}-${phase}-background.png`)});await page.waitForTimeout(600)}
 }
}finally{await browser.close();await writeFile(`${out}/contrast.json`,JSON.stringify(samples,null,2))}
const failures=samples.flatMap(s=>s.text.filter(t=>t.contrast<t.required).map(t=>({screen:s.screen,phase:s.phase,...t})));
console.log(JSON.stringify({samples:samples.length,textChecks:samples.reduce((n,s)=>n+s.text.length,0),failures},null,2));
expect(failures).toEqual([]);
