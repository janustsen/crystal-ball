import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {join} from 'node:path';

async function startAdapter(t:TestContext,psql:string){
 const directory=await mkdtemp(join(process.cwd(),'.dev-transport-test-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 await writeFile(join(directory,'psql'),`#!/usr/bin/env node\n${psql}`,{mode:0o700});
 const child=spawn(process.execPath,['scripts/social-dev-transport.mjs'],{
  env:{...process.env,PG_BIN:directory,SOCIAL_DB_PORT:'0'},
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
 return {base,directory};
}
const serviceCall=(base:string,name:string,body:object)=>fetch(`${base}/rest/v1/rpc/${name}`,{
 method:'POST',headers:{Authorization:'Bearer verification-service-only','Content-Type':'application/json'},
 body:JSON.stringify(body),signal:AbortSignal.timeout(3000),
});

test('dev transport executes web-reading RPCs through HTTP', {timeout:15000}, async t=>{
 const {base,directory}=await startAdapter(t,`const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const fixture=JSON.parse(readFileSync(__dirname+'/fixture.json','utf8'));
assert.deepEqual(process.argv.slice(2),['-X','-At','-v','ON_ERROR_STOP=1','-c',fixture.sql]);
if(fixture.error){console.error('ERROR: '+fixture.error);process.exit(1)}
console.log('BEGIN\\nSET\\n'+JSON.stringify(fixture.result)+'\\nCOMMIT');
`);
 const fixture=join(directory,'fixture.json');
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
  const response=await serviceCall(base,entry.name,entry.body);
  const result=await response.json();
  assert.equal(response.status,entry.error?400:200,`${entry.name}: ${JSON.stringify(result)}`);
  assert.deepEqual(result,entry.error?{message:entry.error,code:'verification'}:entry.result);
 }
});

// Every public SQL function the app or server names must pass the adapter with its current parameters,
// and set-returning functions must come back as arrays, so new RPCs cannot silently fail on the preview.
test('dev transport allows every RPC the app and server call', {timeout:30000}, async t=>{
 const functions=new Map<string,{params:string[];rows:boolean}>();
 for(const file of (await readdir('supabase/migrations')).sort()){
  for(const [,name,params,rows] of (await readFile(join('supabase/migrations',file),'utf8')).matchAll(/create (?:or replace )?function public\.(\w+)\(([^;]*?)\)\s*returns\s+(table|setof)?/gi)){
   functions.set(name,{params:params.split(/,(?![^(]*\))/).map(param=>param.trim().split(/\s+/)[0]).filter(Boolean),rows:Boolean(rows)});
  }
 }
 let source='';
 for(const directory of ['app','server','src']){
  for(const file of await readdir(directory,{recursive:true}))if(/\.(ts|tsx|mts|cjs)$/.test(file))source+=await readFile(join(directory,file),'utf8');
 }
 const called=[...functions.keys()].filter(name=>new RegExp(`['"\`/]${name}['"\`]`).test(source));
 for(const name of ['claim_web_reading','claim_chart_weather','claim_social_pushes','claim_sky_pushes','finish_sky_push'])assert.ok(called.includes(name),`scan finds ${name}`);
 const {base}=await startAdapter(t,"console.log('BEGIN\\nSET\\n'+JSON.stringify(process.argv.at(-1))+'\\nCOMMIT');");
 for(const name of called){
  const {params,rows}=functions.get(name)!;
  const response=await serviceCall(base,name,Object.fromEntries(params.map(param=>[param,'x'])));
  const statement=await response.json();
  assert.equal(response.status,200,`${name} is allowed: ${JSON.stringify(statement)}`);
  assert.match(statement,new RegExp(`public\\.${name}\\(${params.map(param=>`${param} => 'x'`).join(',')}\\)`),`${name} forwards ${params.join(',')||'no arguments'}`);
  assert.equal(statement.includes('jsonb_agg'),rows,`${name} ${rows?'returns':'does not return'} rows`);
 }
});
