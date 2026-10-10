import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
const bridge=createRequire(import.meta.url)('../server/preview.cjs');
test('native clients supply their own origin to every preview route',async()=>{
 const secret=randomBytes(32).toString('hex');
 let forwarded=0;
 let omenValue:Record<string,unknown>={text:'Your personal omen'};
 const upstream=createServer(async(req,res)=>{
  forwarded++;
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=Buffer.concat(chunks).toString();
  if(body&&JSON.parse(body).question==='Today’s personal omen')assert.equal(JSON.parse(body).aiConsent,'Candidate AI');
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({kind:'ok',value:omenValue,path:req.url,body:body?JSON.parse(body):null}));
 });
 const server=createServer(bridge((_req:any,res:any)=>res.end('public client bundle'),secret));
 const keys=['CRYSTAL_BALL_ENGINE_PORT','EXPO_PUBLIC_ENGINE_URL','EXPO_PUBLIC_PREVIEW_SECRET'] as const;
 const previous=keys.map(key=>process.env[key]);
 const originalFetch=globalThis.fetch;
 try{
  await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  process.env.CRYSTAL_BALL_ENGINE_PORT=String((upstream.address() as {port:number}).port);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  process.env.EXPO_PUBLIC_ENGINE_URL=base+'/engine';
  process.env.EXPO_PUBLIC_PREVIEW_SECRET=secret;
  const {requestOmen,request,requestChartWeather,previewHeaders}=await import('../src/api');
  const {invalidateOmen,loadDailyOmen,omenKey}=await import('../src/daily-omen');
  const whisper='By tonight, a small plan may change for the better.';
  for(const invalid of [undefined,null,42,'','By tonight, short.',`By tonight, ${'a'.repeat(140)}.`,'A small plan may change for the better.'])for(const recover of [true,false]){
   invalidateOmen();omenValue={text:'Your personal omen',whisper:invalid};
   const values=new Map<string,string>(),before=forwarded;
   const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value);}};
   const generate=()=>requestOmen({},{sunSign:null,ageConfirmed:true},'Candidate AI');
   const first=await loadDailyOmen(storage,{},generate,undefined,()=>{});
   assert.equal(first.text,null);assert.equal(first.tries,1);
   assert.equal(JSON.parse(values.get(omenKey)!).text,null,'invalid whispers cannot cache a successful omen');
   if(recover)omenValue={text:'Your personal omen',whisper};
   const second=await loadDailyOmen(storage,{},generate,undefined,()=>{});
   assert.equal(second.tries,2);assert.equal(second.text,recover?'Your personal omen':null);
   assert.equal(second.whisper,recover?whisper:null);
   await loadDailyOmen(storage,{},generate,undefined,()=>{});
   assert.equal(forwarded,before+2,'a valid reply is cached and repeated failures stop at two requests');
  }
  invalidateOmen();omenValue={text:'Your personal omen',whisper};
  assert.deepEqual(await requestOmen({},{sunSign:null,ageConfirmed:true},'Candidate AI'),omenValue);
  assert.equal(await requestChartWeather({ageConfirmed:true}),'Your personal omen');
  for(const action of ['plan','predict'] as const){
   assert.equal((await request(action,'Question',{},false,new AbortController().signal)).kind,'ok');
  }
  for(const [path,target] of [['/engine','/'],['/engine/social','/social'],['/engine/billing','/billing'],['/engine/health','/health']]){
   const init={method:path.endsWith('health')?'GET':'POST',headers:previewHeaders,...(path.endsWith('health')?{}:{body:JSON.stringify({action:'omen'})})};
   const response=await originalFetch(base+path,init);
   assert.equal(response.status,200);
   const result=await response.json();assert.equal(result.path,target);
   assert.deepEqual(result.body,path.endsWith('health')?null:{action:'omen'});
   assert.equal((await originalFetch(base+path,{...init,headers:{origin:base}})).status,401);
   assert.equal((await originalFetch(base+path,{...init,headers:{origin:'https://other.invalid','x-preview-token':secret}})).status,403);
  }
  const before=forwarded;
  const headerCases:Record<string,string>[]=[{},{origin:base,'x-preview-token':secret}];
  for(const method of ['GET','POST'])for(const headers of headerCases){
   const removed=await originalFetch(base+'/engine/share',{method,headers});
   assert.equal(await removed.text(),'public client bundle');
   assert.equal(forwarded,before);
  }
 }finally{
  keys.forEach((key,index)=>{if(previous[index]===undefined)delete process.env[key];else process.env[key]=previous[index]});
  await Promise.all([server,upstream].map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));
 }
});
test('preview forwards every engine route to the configured port',async()=>{
 const previousPort=process.env.ENGINE_PORT,secret=randomBytes(32).toString('hex');
 let forwarded=0;
 const engine=createServer(async(req,res)=>{
  forwarded++;
  let body='';for await(const chunk of req)body+=chunk;
  res.writeHead(202,{'content-type':'application/json'});
  res.end(JSON.stringify({path:req.url,method:req.method,body}));
 });
 const server=createServer(bridge((_req:any,res:any)=>res.end('private client bundle'),secret));
 try{
  await new Promise<void>(resolve=>engine.listen(0,'127.0.0.1',resolve));
  process.env.ENGINE_PORT=String((engine.address() as {port:number}).port);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  for(const [path,target] of [['/engine','/'],['/engine/social','/social'],['/engine/health','/health']]){
   const method=path==='/engine/health'?'GET':'POST',body=method==='POST'?'{"question":"hello"}':undefined;
   const response=await fetch(base+path,{method,body,headers:{'x-preview-token':secret,origin:base}});
   assert.equal(response.status,202);
   assert.equal(response.headers.get('content-type'),'application/json');
   assert.deepEqual(await response.json(),{path:target,method,body:body??''});
  }
  const removed=await fetch(base+'/engine/share',{method:'POST',headers:{'x-preview-token':secret,origin:base}});
  assert.equal(await removed.text(),'private client bundle');
  assert.equal(forwarded,3);
 }finally{
  if(previousPort===undefined)delete process.env.ENGINE_PORT;else process.env.ENGINE_PORT=previousPort;
  await Promise.all([server,engine].map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));
 }
});
test('preview refuses unauthenticated engine calls while the page and bundle load without login',async()=>{
 const secret=randomBytes(32).toString('hex');
 const server=createServer(bridge((_req:any,res:any)=>res.end('public client bundle'),secret));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as {port:number},base=`http://127.0.0.1:${address.port}`;
 try{
  for(const path of ['/engine','/engine/social']){
   assert.equal((await fetch(base+path,{method:'POST',body:'{}'})).status,401);
   assert.equal((await fetch(base+path,{method:'POST',headers:{origin:base},body:'{}'})).status,401);
   assert.equal((await fetch(base+path,{method:'POST',headers:{'x-preview-token':secret},body:'{}'})).status,401);
  }
  // Owner-approved change: captain requested removal of the page login; engine checks remain.
  for(const path of ['/','/index.bundle']){
   const response=await fetch(base+path);assert.equal(response.status,200);
   assert.equal(response.headers.get('www-authenticate'),null);assert.equal(await response.text(),'public client bundle');
  }
  assert.equal((await fetch(base+'/engine/health')).status,401);
  assert.equal((await fetch(base+'/engine/health',{headers:{'x-preview-token':secret}})).status,401);
  const authenticated=await fetch(base+'/index.bundle',{headers:{authorization:'Basic '+Buffer.from(`preview:${secret}`).toString('base64')}});
  assert.equal(authenticated.status,200);assert.equal(await authenticated.text(),'public client bundle');
  assert.equal((await fetch(base+'/engine',{headers:{'x-preview-token':secret,origin:base}})).status,405);
  assert.equal((await fetch(base+'/engine',{method:'POST',headers:{'x-preview-token':secret,origin:'https://other.invalid'},body:'{}'})).status,403);
  for(const path of ['/engine','/engine/social','/engine/health']){
   assert.equal((await fetch(base+path,{method:path.endsWith('/health')?'POST':'GET',headers:{'x-preview-token':secret,origin:base}})).status,405);
   assert.equal((await fetch(base+path,{method:path.endsWith('/health')?'GET':'POST',headers:{'x-preview-token':secret,origin:'https://other.invalid'}})).status,403);
  }
  assert.equal((await fetch(base+'/engine/health',{headers:{'x-preview-token':'é'.repeat(94),origin:base}})).status,401);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
test('preview fails closed without startup secret',async()=>{
 const server=createServer(bridge((_req:any,res:any)=>res.end('not public'),undefined));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal((await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/engine/health`)).status,401)}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});

test('preview routes every engine endpoint to ENGINE_PORT and forwards social identity',async()=>{
 const secret=randomBytes(32).toString('hex'),previousPort=process.env.ENGINE_PORT;
 const upstream=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.writeHead(202,{'content-type':'application/json'});
  res.end(JSON.stringify({path:req.url,method:req.method,authorization:req.headers.authorization??null,previewToken:req.headers['x-preview-token']??null,body}));
 });
 const server=createServer(bridge((_req:any,res:any)=>res.end('bundle'),secret));
 await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 process.env.ENGINE_PORT=String((upstream.address() as {port:number}).port);
 try{
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  for(const [path,target] of [['/engine','/'],['/engine/social','/social'],['/engine/health','/health']]){
   const method=target==='/health'?'GET':'POST',body=method==='POST'?'{"action":"profile"}':undefined;
   for(const authorization of [undefined,'Bearer social-user']){
    const response=await fetch(base+path,{method,headers:{'x-preview-token':secret,origin:base,...(authorization?{authorization}:{})},body});
    assert.equal(response.status,202);
    assert.deepEqual(await response.json(),{path:target,method,authorization:authorization??null,previewToken:null,body:body??''});
   }
  }
 }finally{
  if(previousPort===undefined)delete process.env.ENGINE_PORT;else process.env.ENGINE_PORT=previousPort;
  await Promise.all([new Promise<void>(resolve=>server.close(()=>resolve())),new Promise<void>(resolve=>upstream.close(()=>resolve()))]);
 }
});
