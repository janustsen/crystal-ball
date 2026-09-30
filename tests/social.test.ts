import test from 'node:test';
import assert from 'node:assert/strict';
import {isSkyPrompt,safeSealedHeadline,sampleStars,skyPrompts} from '../src/social-policy';
import {phraseSafety as clientSafety} from '../src/safety-policy';
import {phraseSafety as engineSafety} from '../server/safety';
import {moderateSocialLine,socialHandler} from '../server/social';
import type {ModelProvider} from '../server/provider';
import {provider} from '../server/provider';

test('sample stars are safe inspiration and never claim to be people',()=>{
 assert.equal(sampleStars.length,6);
 assert.ok(sampleStars.every(star=>star.synthetic&&!star.mine&&star.resonances===0));
 for(const prompt of Object.values(skyPrompts))assert.equal(clientSafety(prompt.question),undefined);
 for(const text of ['__proto__','constructor','My name is Alice','love@example.com',null,12])assert.equal(isSkyPrompt(text),false);
 assert.equal(isSkyPrompt('love'),true);
});

test('publication fails closed on AI refusal or model failure',async()=>{
 const refusing:ModelProvider={async json<T>(){return {safe:false} as T}};
 await assert.rejects(moderateSocialLine('Will a new opportunity find me?','star',true,refusing),/cannot be shared/);
 const unavailable:ModelProvider={async json(){throw new Error('Model unavailable')}};
 await assert.rejects(moderateSocialLine('Will a new opportunity find me?','star',true,unavailable),/Model unavailable/);
});

test('social service requires server configuration and authenticated identity before model work',async()=>{
 let called=false;const model:ModelProvider={async json(){called=true;throw new Error('must not run')}};
 const request=()=>new Request('http://localhost/social',{method:'POST',body:JSON.stringify({action:'draft',kind:'star',text:'private question'})});
 assert.equal((await socialHandler(()=>undefined,model)(request())).status,503);
 assert.equal((await socialHandler(key=>key==='SUPABASE_URL'?'http://127.0.0.1:55329':key==='SUPABASE_SERVICE_ROLE_KEY'?'local-only':undefined,model)(request())).status,401);
 assert.equal(called,false);
});

test('Friend reading repairs an oversized Why with the precise field limit',async t=>{
 const forecastRequests:Record<string,any>[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input);let body:unknown;
  if(url.endsWith('/auth/v1/user'))body={id:'00000000-0000-0000-0000-000000000001'};
  else if(url.includes('/social_profiles?'))body=[{age_band:'unknown'}];
  else if(url.endsWith('/rpc/authorize_friend_reading'))body={sun_sign:'leo',themes:[],teen_viewer:true};
  else if(url.endsWith('/api/chat')){
   const request=JSON.parse(String(init?.body)),system=request.messages[0].content;
   let output:unknown;
   if(system.startsWith('Classify this prediction'))output={category:'allow'};
   else if(system.startsWith('You moderate published text'))output={safe:true};
   else {
    forecastRequests.push(request);
    const repair=request.messages.at(-1).content.toLowerCase();
    // Recorded failure: the model repeats its 189-character Why when only
    // given the provider's generic "check field lengths" repair instruction.
    const precise=repair.includes('why')&&repair.includes('160');
    output={headline:'Your friend will explore a creative goal this year.',why:precise?'A Leo-inspired creative nudge, based only on a sun sign. No goal details are known.':'A'.repeat(189)};
   }
   body={message:{content:JSON.stringify(output)}};
  }else throw new Error(`Unexpected test URL: ${url}`);
  return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 });
 const env=(key:string)=>({SUPABASE_URL:'http://supabase.local',SUPABASE_SERVICE_ROLE_KEY:'test-only',OLLAMA_URL:'http://model.local'}[key]);
 const response=await socialHandler(env,provider(env))(new Request('http://localhost/social',{method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify({action:'friend',question:'Will this friend make progress on a creative goal this year?',circle:'00000000-0000-0000-0000-000000000010',member:'00000000-0000-0000-0000-000000000002'})}));
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(forecastRequests.length,2,'exactly one repair');
 const result=await response.json();assert.ok(result.why.length<=160);
});

test('incoming private seal text is filtered before display',()=>{
 for(const text of ['Will my IVF succeed?','When will I die?','Will I win my lawsuit?','Call +1 555 123 4567','See https://example.com','me@example.com','fuck off',null,{},'x'.repeat(161)])assert.equal(safeSealedHeadline(text),false,String(text));
 assert.equal(safeSealedHeadline('You will discover a new creative skill in 6 months.'),true);
});

test('moving phrase policy to the shared module preserves the actual engine function',()=>{
 assert.equal(engineSafety,clientSafety);
 assert.equal(engineSafety('Will my IVF succeed?'),'pregnancy');
 assert.equal(engineSafety('Will I publish a novel about cancer?'),undefined);
});
