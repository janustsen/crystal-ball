import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('built iOS engine check catches the shipped stale plist and mismatched bundled environment',()=>{
 const app=mkdtempSync(join(tmpdir(),'cb-ios-engine-'));
 const engine='http://preview.example.ts.net:8087/engine',token='fixture-preview-token';
 const run=(url=engine,secret=token)=>spawnSync('python3',['scripts/check-ios-engine.py',app],{encoding:'utf8',env:{...process.env,EXPO_PUBLIC_ENGINE_URL:url,EXPO_PUBLIC_PREVIEW_SECRET:secret}});
 const plist=(exception:boolean)=>execFileSync('python3',['-c',`import plistlib,sys
ats={'NSAllowsLocalNetworking':True}
if sys.argv[2]=='true': ats['NSExceptionDomains']={'preview.example.ts.net':{'NSExceptionAllowsInsecureHTTPLoads':True}}
with open(sys.argv[1],'wb') as f: plistlib.dump({'NSAppTransportSecurity':ats},f,fmt=plistlib.FMT_BINARY)
`,join(app,'Info.plist'),String(exception)]);
 try{
  writeFileSync(join(app,'main.jsbundle'),`${engine}\0${token}`);
  plist(false);
  const stale=run();assert.equal(stale.status,1);assert.match(stale.stderr,/ATS exception/);
  plist(true);assert.equal(run().status,0);
  assert.match(run(engine,'').stderr,/PREVIEW_SECRET/);
  assert.match(run(engine,'different-token').stderr,/JavaScript/);
  assert.match(run('http://different.example.ts.net:8087/engine').stderr,/ATS exception/);
  assert.match(run('https://hosted.example.com').stderr,/JavaScript/);
  assert.match(run('').stderr,/ENGINE_URL/);
  writeFileSync(join(app,'main.jsbundle'),'https://hosted.example.com');
  plist(false);assert.equal(run('https://hosted.example.com','').status,0);
 }finally{rmSync(app,{recursive:true,force:true})}
});
