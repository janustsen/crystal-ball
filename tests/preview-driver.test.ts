import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:http';
test('login-free browser opening omits credentials and preserves redacted CLI diagnostics',async()=>{
 const secret=randomBytes(32).toString('hex');process.env.EXPO_PUBLIC_PREVIEW_SECRET=secret;
 const {openAuthenticatedPreview}=await import('../scripts/preview-auth.mjs');
 mkdirSync('.local',{recursive:true});const dir=mkdtempSync(join(process.cwd(),'.local/preview-driver-test-'));
 try{
  const binary=join(dir,'chrome-devtools-axi'),record=join(dir,'request.json');
  writeFileSync(binary,'#!/usr/bin/env node\nconst fs=require("node:fs");fs.writeFileSync(process.env.DRIVER_RECORD,JSON.stringify({args:process.argv.slice(2),input:fs.readFileSync(0,"utf8")}));if(process.env.DRIVER_FAIL){process.stderr.write("Navigation timeout: https://preview:"+process.env.EXPO_PUBLIC_PREVIEW_SECRET+"@localhost/ "+process.env.EXPO_PUBLIC_PREVIEW_SECRET);process.exit(1)}\n',{mode:0o700});
  const env={...process.env,PATH:dir+':'+process.env.PATH,DRIVER_RECORD:record};
  openAuthenticatedPreview('http://localhost:8087',env);
  const request=JSON.parse(readFileSync(record,'utf8'));assert.deepEqual(request.args,['run']);assert.ok(!JSON.stringify(request.args).includes(secret));
  let destination='';await new Function('page',`return (async()=>{${request.input}})()`)({open:async(url:string)=>{destination=url}});
  assert.equal(new URL(destination).password,'');assert.equal(new URL(destination).username,'');assert.ok(!request.input.includes(secret));assert.equal(new URL(destination).hostname,'localhost');
  assert.throws(()=>openAuthenticatedPreview('http://localhost:8087',{...env,DRIVER_FAIL:'1'}),error=>error instanceof Error&&!error.message.includes(secret)&&error.message.includes('Navigation timeout')&&error.message.includes('[redacted]')&&!error.message.includes('preview:'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('preview HTTP credentials preserve social identity and allow independent rejection probes',async()=>{
 process.env.EXPO_PUBLIC_PREVIEW_SECRET ||= randomBytes(32).toString('hex');
 const {previewFetch,previewSecret}=await import('../scripts/preview-auth.mjs');
 const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(req.headers))});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  const headers=await previewFetch(base+'/engine/social',{method:'POST',headers:{Authorization:'Bearer social-identity'},body:'{}'}).then(response=>response.json());
  assert.equal(headers['x-preview-token'],previewSecret);assert.equal(headers.origin,base);assert.equal(headers.authorization,'Bearer social-identity');
  const missingPreview=await previewFetch(base+'/engine/social',{headers:{'x-preview-token':'',Authorization:'Bearer social-identity'}}).then(response=>response.json());
  assert.equal(missingPreview['x-preview-token'],'');assert.equal(missingPreview.authorization,'Bearer social-identity');
  const missingIdentity=await previewFetch(base+'/engine/social').then(response=>response.json());
  assert.equal(missingIdentity['x-preview-token'],previewSecret);assert.equal(missingIdentity.authorization,undefined);
  const foreign=await previewFetch(base+'/engine/social',{headers:{origin:'http://localhost:9999'}}).then(response=>response.json());
  assert.equal(foreign.origin,'http://localhost:9999');assert.equal(foreign['x-preview-token'],previewSecret);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
