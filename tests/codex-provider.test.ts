import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {codexProvider} from '../server/codex-provider.ts';
import {handler} from '../server/handler.ts';
test('Codex cannot be selected by the deployed factory or production runtime',()=>{
 assert.throws(()=>handler(k=>k==='MODEL_PROVIDER'?'codex':undefined),/Unknown model/);
 assert.throws(()=>codexProvider(k=>k==='NODE_ENV'?'production':undefined),/development-only/);
});
test('CLI boundary uses argv/stdin, ChatGPT auth, read-only ephemeral requests and the common repair validator',async()=>{
 await mkdir('.local',{recursive:true});const dir=await mkdtemp(resolve('.local/codex-test-'));
 const before={PATH:process.env.PATH,OPENAI_API_KEY:process.env.OPENAI_API_KEY,CODEX_API_KEY:process.env.CODEX_API_KEY,CODEX_TEST_LOG:process.env.CODEX_TEST_LOG};
 try{
  const log=join(dir,'calls.jsonl');
  await writeFile(join(dir,'codex'),`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
fs.appendFileSync(process.env.CODEX_TEST_LOG,JSON.stringify({args,apiKeyPresent:!!process.env.OPENAI_API_KEY||!!process.env.CODEX_API_KEY,input})+'\\n');
fs.writeFileSync(args[args.indexOf('--output-last-message')+1],JSON.stringify({ready:input.includes('Repair the previous output')}));
});`,{mode:0o700});
  process.env.PATH=`${dir}:${before.PATH}`;process.env.CODEX_TEST_LOG=log;process.env.OPENAI_API_KEY='must-not-inherit';process.env.CODEX_API_KEY='must-not-inherit';
  const model='gpt-6-luna; this-is-one-argv';
  const result=await codexProvider(k=>k==='CODEX_MODEL'?model:undefined).json('Readiness only.',{question:'$(not a shell command)'},{type:'object',properties:{ready:{type:'boolean'}},required:['ready'],additionalProperties:false},x=>!!x&&typeof x==='object'&&'ready'in x&&x.ready===true);
  assert.deepEqual(result,{ready:true});const calls=(await readFile(log,'utf8')).trim().split('\n').map(x=>JSON.parse(x));assert.equal(calls.length,2);
  for(const call of calls){assert.equal(call.apiKeyPresent,false);assert.ok(call.args.includes('--ephemeral'));assert.ok(call.args.includes('read-only'));assert.ok(call.args.includes('forced_login_method="chatgpt"'));assert.equal(call.args[call.args.indexOf('-m')+1],model);assert.match(call.input,/\$\(not a shell command\)/);}
  for(const call of calls)await assert.rejects(readFile(call.args[call.args.indexOf('--output-last-message')+1]),{code:'ENOENT'});
 }finally{for(const [key,value] of Object.entries(before)){if(value===undefined)delete process.env[key];else process.env[key]=value}await rm(dir,{recursive:true,force:true})}
});
