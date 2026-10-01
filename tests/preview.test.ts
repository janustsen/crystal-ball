import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
const bridge=createRequire(import.meta.url)('../server/preview.cjs');
test('preview refuses unauthenticated engine calls and protects the injected-key bundle',async()=>{
 const secret=randomBytes(32).toString('hex');
 const server=createServer(bridge((_req:any,res:any)=>res.end('private client bundle'),secret));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as {port:number},base=`http://127.0.0.1:${address.port}`;
 try{
  for(const path of ['/engine','/engine/share']){
   assert.equal((await fetch(base+path,{method:'POST',body:'{}'})).status,401);
   assert.equal((await fetch(base+path,{method:'POST',headers:{origin:base},body:'{}'})).status,401);
   assert.equal((await fetch(base+path,{method:'POST',headers:{'x-preview-token':secret},body:'{}'})).status,401);
  }
  for(const path of ['/','/index.bundle','/engine/health'])assert.equal((await fetch(base+path)).status,401);
  assert.equal((await fetch(base+'/engine/health',{headers:{'x-preview-token':secret}})).status,401);
  const authenticated=await fetch(base+'/index.bundle',{headers:{authorization:'Basic '+Buffer.from(`preview:${secret}`).toString('base64')}});
  assert.equal(authenticated.status,200);assert.equal(await authenticated.text(),'private client bundle');
  assert.equal((await fetch(base+'/engine',{headers:{'x-preview-token':secret,origin:base}})).status,405);
  assert.equal((await fetch(base+'/engine',{method:'POST',headers:{'x-preview-token':secret,origin:'https://other.invalid'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/',{headers:{authorization:'é'.repeat(94)}})).status,401);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
test('preview fails closed without startup secret',async()=>{
 const server=createServer(bridge((_req:any,res:any)=>res.end('not public'),undefined));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal((await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/`)).status,401)}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
