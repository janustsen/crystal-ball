import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler';
import type {ModelProvider} from '../server/provider';

test('abandoning background planning cancels its model work without waiting for the planning deadline',async()=>{
 let started!:()=>void,finish!:(error:Error)=>void,aborted=false;
 const entered=new Promise<void>(resolve=>{started=resolve});
 const model:ModelProvider={json:(_system,_input,_schema,_valid,signal)=>new Promise((_resolve,reject)=>{
  finish=reject;signal?.addEventListener('abort',()=>{aborted=true;reject(new Error('Planning canceled'))},{once:true});started();
 })};
 const controller=new AbortController();
 const pending=handler(()=>undefined,model)(new Request('http://localhost/',{method:'POST',signal:controller.signal,body:JSON.stringify({action:'plan',question:'Will I finish my painting this month?',facts:{},ageConfirmed:true})}));
 try{await entered;controller.abort();await new Promise(resolve=>setImmediate(resolve));assert.equal(aborted,true)}
 finally{finish(new Error('Test complete'));await pending}
});

test('the real local HTTP adapter propagates a disconnected plan to the upstream model',async()=>{
 const {createServer}=await import('node:http'),{spawn}=await import('node:child_process');
 let entered!:()=>void,closed!:()=>void;
 const started=new Promise<void>(resolve=>{entered=resolve}),canceled=new Promise<void>(resolve=>{closed=resolve});
 const upstream=createServer(async(req,res)=>{for await(const _ of req){}res.once('close',closed);entered()});
 await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const upstreamPort=(upstream.address() as {port:number}).port;
 const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
 const child=spawn(process.execPath,['--import','tsx',new URL('../server/local.ts',import.meta.url).pathname],{cwd:new URL('..',import.meta.url),env:{...process.env,ENGINE_PORT:String(port),MODEL_PROVIDER:'ollama',OLLAMA_URL:`http://127.0.0.1:${upstreamPort}`,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
 const timeout=AbortSignal.timeout(15000),controller=new AbortController();
 try{
  await new Promise<void>((resolve,reject)=>{child.stdout.on('data',data=>{if(String(data).includes('engine ready'))resolve()});child.once('error',reject);child.once('exit',code=>reject(new Error(`Engine exited ${code}`)));timeout.addEventListener('abort',()=>reject(new Error('Engine startup timed out')),{once:true})});
  const request=fetch(`http://127.0.0.1:${port}`,{method:'POST',body:JSON.stringify({action:'plan',question:'Will I finish my painting this month?',facts:{},ageConfirmed:true}),signal:AbortSignal.any([controller.signal,timeout])}).catch(()=>null);
  await Promise.race([started,new Promise((_,reject)=>timeout.addEventListener('abort',()=>reject(new Error('Model never started')),{once:true}))]);
  controller.abort();await request;
  await Promise.race([canceled,new Promise((_,reject)=>timeout.addEventListener('abort',()=>reject(new Error('Model was not canceled')),{once:true}))]);
 }finally{controller.abort();if(child.exitCode===null&&child.signalCode===null){const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGTERM');await exited;}upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()))}
});
