import {chromium} from '@playwright/test';
const out='docs/ux-loop/expansion-52',b=await chromium.launch({channel:'chrome',headless:true});
try{const c=await b.newContext({viewport:{width:390,height:700}}),p=await c.newPage();for(const v of ['current','varied','thin']){await p.goto(`${process.env.PREVIEW_URL||'http://localhost:8098'}/concepts/expansion-52.html?v=${v}`);await p.waitForLoadState('networkidle');await p.screenshot({path:`${out}/${v}.png`})}}finally{await b.close()}
