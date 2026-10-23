// Regression: --no-dev sets production mode but must not activate the explicit release gate.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from '@playwright/test';
const evidence=await mkdtemp(join(tmpdir(),'cb-release-preview-')),port=process.env.RELEASE_PREVIEW_PORT||'8108';
const env={...process.env,NODE_ENV:'production',EXPO_NO_DOTENV:'1',TMPDIR:evidence};
for(const key of ['CRYSTAL_BALL_RELEASE','EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_ENGINE_URL','EXPO_PUBLIC_PREVIEW_SECRET'])delete env[key];
const child=spawn(process.execPath,['scripts/start-preview.mjs','--max-workers','1','--no-dev','--minify','--host','localhost','--port',port],{env,detached:true,stdio:['ignore','pipe','pipe']});
let log='',browser;
child.stdout.on('data',chunk=>log+=chunk);child.stderr.on('data',chunk=>log+=chunk);
try{
 const until=Date.now()+60000;
 while(true){
  if(child.exitCode!==null)throw new Error(`Preview exited (${child.exitCode})`);
  try{if((await fetch(`http://localhost:${port}`,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
  if(Date.now()>until)throw new Error('Preview startup timed out');
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`http://localhost:${port}`,{timeout:180000});await page.getByTestId('birthday-month').waitFor({timeout:60000});
 await page.screenshot({path:join(evidence,'preview.png')});
 const release=spawnSync(process.execPath,['node_modules/expo/bin/cli','config','--json'],{env:{...env,CRYSTAL_BALL_RELEASE:'true'},encoding:'utf8'});
 assert.notEqual(release.status,0);assert.match(release.stderr,/Release requires EXPO_PUBLIC_SUPABASE_URL/);
 console.log('PASS: actual no-dev preview renders without a release flag; release config refuses missing settings. Evidence:',evidence);
}finally{
 await browser?.close();
 try{process.kill(-child.pid,'SIGTERM')}catch{}
 await writeFile(join(evidence,'metro.log'),log);
}
