import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/share-tints';
const prediction=JSON.parse(await readFile('docs/ux-loop/expansion-16/fixture.json','utf8'));
const variants=[
 {name:'classic',cardStyle:'classic',plus:true,golden:false},
 {name:'gold',cardStyle:'gold',plus:true,golden:false},
 {name:'obsidian',cardStyle:'obsidian',plus:true,golden:false},
 {name:'golden',cardStyle:'obsidian',plus:true,golden:true},
 {name:'free',cardStyle:'obsidian',plus:false,golden:false},
];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{
 for(const variant of variants){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  try{
   await page.addInitScript(({prediction,variant})=>localStorage.setItem('crystal-ball-v1',JSON.stringify({onboardingDone:true,ageConfirmed:true,facts:{},history:[{...prediction,golden:variant.golden}],credits:0,plus:variant.plus,cardStyle:variant.cardStyle,ballStyle:'classic',reduceMotion:true})),{prediction,variant});
   await page.goto(base);await page.getByTestId('tab-history').click();
   await page.getByRole('button').filter({hasText:prediction.headline}).click();
   await page.getByTestId('share-this-glimpse').click();
   const preview=page.getByRole('img',{name:/^Crystal Ball\./});await preview.waitFor();
   const sample=src=>page.evaluate(async src=>{
    const img=new Image();img.src=src;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,540,960);
    return {width:img.naturalWidth,height:img.naturalHeight,pixel:Array.from(ctx.getImageData(40,480,1,1).data)};
   },src);
   const small=await sample(await preview.getAttribute('src'));
   expect([small.width,small.height]).toEqual([540,960]);
   const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();
   const path=`${out}/${variant.name}.png`;await(await download).saveAs(path);
   const full=await sample('data:image/png;base64,'+(await readFile(path)).toString('base64'));
   expect([full.width,full.height]).toEqual([1080,1920]);
   expect(small.pixel[3]).toBe(255);expect(full.pixel[3]).toBe(255);
   for(let channel=0;channel<3;channel++)expect(Math.abs(small.pixel[channel]-full.pixel[channel])).toBeLessThanOrEqual(4);
   await page.getByTestId('share-result-done').click();
   checks.push({name:variant.name,preview:small.pixel,export:full.pixel});
  }finally{await context.close()}
 }
 for(const output of ['preview','export']){
  const pixel=name=>checks.find(row=>row.name===name)[output];
  expect(pixel('gold')[0]-pixel('obsidian')[0]).toBeGreaterThan(30);
  expect(pixel('classic')[0]-pixel('obsidian')[0]).toBeGreaterThan(8);
  expect(pixel('obsidian')[2]-pixel('classic')[2]).toBeGreaterThan(4);
  expect(pixel('golden')).toEqual(pixel('gold'));
  expect(pixel('free')).toEqual(pixel('classic'));
 }
 console.log('PASS: selected background tint, golden override and free fallback match in preview and PNG.');
}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}
