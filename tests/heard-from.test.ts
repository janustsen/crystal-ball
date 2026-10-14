import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';
import {heardFrom} from '../server/heard-from.ts';

const ask=(serve:(r:Request)=>Promise<Response>,body:unknown,headers:Record<string,string>={})=>serve(new Request('http://localhost/',{method:'POST',headers,body:JSON.stringify(body)}));

test('the engine counts a known answer without needing a question, consent or session',async()=>{
 const serve=handler(()=>undefined);
 const counted=await ask(serve,{action:'heard',source:'TikTok'});
 assert.equal(counted.status,200);assert.deepEqual(await counted.json(),{kind:'ok'});
 for(const source of ['Twitter',undefined,'']){const refused=await ask(serve,{action:'heard',source});assert.equal(refused.status,400);}
});

test('only the day and answer reach the database or the local tally',async t=>{
 const sent:{url:string;body:unknown}[]=[];
 t.mock.method(globalThis,'fetch',async(url:string,init:RequestInit)=>{sent.push({url,body:JSON.parse(String(init.body))});return new Response('null')});
 const hosted=heardFrom(key=>({SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'service'})[key]);
 await hosted.count('A friend');
 assert.deepEqual(sent,[{url:'https://db.example/rest/v1/rpc/count_heard_from',body:{heard:'A friend'}}]);
 const local=heardFrom(()=>undefined);
 await local.count('App Store');await local.count('App Store');
 assert.deepEqual([...local.local.values()],[2]);
 assert.match([...local.local.keys()][0],/^\d{4}-\d{2}-\d{2} App Store$/);
});
