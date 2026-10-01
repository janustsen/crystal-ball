import test from 'node:test';
import assert from 'node:assert/strict';

test('social recovery retries current profile before exposing a snapshot',async t=>{
 const previous={url:process.env.EXPO_PUBLIC_SUPABASE_URL,key:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,engine:process.env.EXPO_PUBLIC_ENGINE_URL};
 process.env.EXPO_PUBLIC_SUPABASE_URL='http://127.0.0.1:55329';
 process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='local-verification-only';
 process.env.EXPO_PUBLIC_ENGINE_URL='http://127.0.0.1:8795';
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}});
 t.after(()=>{
  for(const [key,value] of Object.entries({EXPO_PUBLIC_SUPABASE_URL:previous.url,EXPO_PUBLIC_SUPABASE_ANON_KEY:previous.key,EXPO_PUBLIC_ENGINE_URL:previous.engine})){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
 });
 const {supabase}=await import('../src/cloud');assert.ok(supabase);
 await supabase.auth.initialize();await supabase.auth.stopAutoRefresh();
 t.mock.method(supabase.auth,'getSession',async()=>({data:{session:{access_token:'test-token',user:{id:'viewer'}}},error:null}));
 const {loadSocial,syncSocialProfile}=await import('../src/social');
 let offline=true,reads=0;
 const writes:unknown[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  if(String(input).endsWith('/social')){
   if(offline)return Response.json({message:'Engine offline'},{status:503});
   writes.push(JSON.parse(String(init?.body)));
   return Response.json({ok:true});
  }
  assert.ok(writes.length>0,'snapshot reads must follow successful profile synchronization');
  reads++;
  return Response.json([]);
 });
 const plus={plus:true,ageBand:'adult' as const,sunSign:'leo'};
 await assert.rejects(syncSocialProfile(plus),/Engine offline/);
 await assert.rejects(loadSocial(plus),/Engine offline/);
 assert.equal(reads,0);
 offline=false;
 assert.equal((await loadSocial(plus)).owner,'viewer');
 assert.deepEqual(writes,[{action:'profile',...plus}]);
 assert.equal(reads,8);
 const unknown={plus:false,ageBand:null,sunSign:null};
 await loadSocial(unknown);
 assert.deepEqual(writes,[{action:'profile',...plus},{action:'profile',...unknown}]);
 assert.equal(reads,16);
});
