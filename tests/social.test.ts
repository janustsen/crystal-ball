import test from 'node:test';
import assert from 'node:assert/strict';
import {isSkyPrompt,safeSealedHeadline,sampleStars,skyPrompts} from '../src/social-policy';
import {phraseSafety as clientSafety} from '../src/safety-policy';
import {phraseSafety as engineSafety} from '../server/safety';
import {moderateSocialLine,socialHandler} from '../server/social';
import type {ModelProvider} from '../server/provider';

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

test('incoming private seal text is filtered before display',()=>{
 for(const text of ['Will my IVF succeed?','When will I die?','Will I win my lawsuit?','Call +1 555 123 4567','See https://example.com','me@example.com','fuck off',null,{},'x'.repeat(161)])assert.equal(safeSealedHeadline(text),false,String(text));
 assert.equal(safeSealedHeadline('You will discover a new creative skill in 6 months.'),true);
});

test('moving phrase policy to the shared module preserves the actual engine function',()=>{
 assert.equal(engineSafety,clientSafety);
 assert.equal(engineSafety('Will my IVF succeed?'),'pregnancy');
 assert.equal(engineSafety('Will I publish a novel about cancer?'),undefined);
});
