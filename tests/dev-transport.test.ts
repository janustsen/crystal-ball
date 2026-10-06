import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {join} from 'node:path';

test('dev transport executes web-reading RPCs through HTTP', {timeout:15000}, async t=>{
 const directory=await mkdtemp(join(process.cwd(),'.dev-transport-test-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const fixture=join(directory,'fixture.json');
 await writeFile(join(directory,'psql'),`#!/usr/bin/env node
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const fixture=JSON.parse(readFileSync(process.env.TRANSPORT_FIXTURE,'utf8'));
assert.deepEqual(process.argv.slice(2),['-X','-At','-v','ON_ERROR_STOP=1','-c',fixture.sql]);
if(fixture.error){console.error('ERROR: '+fixture.error);process.exit(1)}
console.log('BEGIN\\nSET\\n'+JSON.stringify(fixture.result)+'\\nCOMMIT');
`,{mode:0o700});
 const child=spawn(process.execPath,['scripts/social-dev-transport.mjs'],{
  env:{...process.env,PG_BIN:directory,TRANSPORT_FIXTURE:fixture,SOCIAL_DB_PORT:'0'},
  stdio:['ignore','pipe','pipe'],
 });
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk});
 t.after(async()=>{
  if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited}
 });
 const [startup]=await Promise.race([
  once(child.stdout,'data',{signal:AbortSignal.timeout(5000)}),
  once(child,'exit').then(([code])=>{throw Error(`Adapter exited (${code}): ${stderr}`)}),
 ]);
 const base=String(startup).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
 assert.ok(base,'adapter announces its listening address');
 const browser='11111111-1111-4111-8111-111111111111',network="network'key";
 const day='2026-10-06',expires_at='2026-10-06T12:10:00+00:00';
 const claim={browser,network,daily_cap:500},reservation={browser,network,day,expires_at};
 const identity=`browser => '${browser}',network => 'network''key'`;
 const lease=`${identity},day => '${day}',expires_at => '${expires_at}'`;
 const cases=[
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:{outcome:'ok',day,expires_at}},
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:{outcome:'browser',day}},
  {name:'complete_web_reading',body:reservation,args:lease,result:true},
  {name:'complete_web_reading',body:reservation,args:lease,result:false},
  {name:'release_web_reading',body:reservation,args:lease,result:null},
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:null,error:'database unavailable'},
 ];
 for(const entry of cases){
  await writeFile(fixture,JSON.stringify({
   sql:`begin; set local role service_role; select coalesce(to_jsonb(public.${entry.name}(${entry.args})),'null'::jsonb); commit;`,
   result:entry.result,error:entry.error,
  }));
  const response=await fetch(`${base}/rest/v1/rpc/${entry.name}`,{
   method:'POST',headers:{Authorization:'Bearer verification-service-only','Content-Type':'application/json'},
   body:JSON.stringify(entry.body),signal:AbortSignal.timeout(3000),
  });
  const result=await response.json();
  assert.equal(response.status,entry.error?400:200,`${entry.name}: ${JSON.stringify(result)}`);
  assert.deepEqual(result,entry.error?{message:entry.error,code:'verification'}:entry.result);
 }
});
