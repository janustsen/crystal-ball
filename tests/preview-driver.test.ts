import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
test('browser authentication passes credentials through stdin, never process arguments or error output',async()=>{
 const secret=randomBytes(32).toString('hex');process.env.EXPO_PUBLIC_PREVIEW_SECRET=secret;
 const {openAuthenticatedPreview}=await import('../scripts/preview-auth.mjs');
 mkdirSync('.local',{recursive:true});const dir=mkdtempSync(join(process.cwd(),'.local/preview-driver-test-'));
 try{
  const binary=join(dir,'chrome-devtools-axi'),record=join(dir,'request.json');
  writeFileSync(binary,'#!/usr/bin/env node\nconst fs=require("node:fs");fs.writeFileSync(process.env.DRIVER_RECORD,JSON.stringify({args:process.argv.slice(2),input:fs.readFileSync(0,"utf8")}));if(process.env.DRIVER_FAIL){process.stderr.write(process.env.EXPO_PUBLIC_PREVIEW_SECRET);process.exit(1)}\n',{mode:0o700});
  const env={...process.env,PATH:dir+':'+process.env.PATH,DRIVER_RECORD:record};
  openAuthenticatedPreview('http://localhost:8087',env);
  const request=JSON.parse(readFileSync(record,'utf8'));assert.deepEqual(request.args,['run']);assert.ok(!JSON.stringify(request.args).includes(secret));
  let destination='';await new Function('page',`return (async()=>{${request.input}})()`)({open:async(url:string)=>{destination=url}});
  assert.equal(new URL(destination).password,secret);assert.equal(new URL(destination).hostname,'localhost');
  assert.throws(()=>openAuthenticatedPreview('http://localhost:8087',{...env,DRIVER_FAIL:'1'}),error=>error instanceof Error&&!error.message.includes(secret)&&error.message.includes('credential withheld'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
