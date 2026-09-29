import test from 'node:test';
import assert from 'node:assert/strict';
import {planFor,projection,registry} from '../src/questions.ts';
import {phraseSafety} from '../server/safety.ts';
import {provider} from '../server/provider.ts';
test('known facts never repeat; each domain keeps Other and 3–10 unique cards',()=>{
 for(const [topic,cards] of Object.entries(registry)){
  const questions:Record<string,string>={money:'net worth',learning:'learn Spanish',relocation:'where will I move',growth:'how many users',sports:'World Cup',world:'Will EVs lead global sales',general:'will my dream happen'};
  for(const n of [0,2,cards.length]){const known:Record<string,string>={...Object.fromEntries(cards.filter(c=>c.remember).slice(0,n).map(c=>[c.id,'known'])),learning_target:'Spanish'};const plan=planFor(questions[topic],known);assert.ok(plan.cards.length>=3&&plan.cards.length<=10);assert.equal(new Set(plan.cards.map(c=>c.id)).size,plan.cards.length);assert.ok(plan.cards.every(c=>c.options.includes('Other')&&(!c.remember||!known[c.id])));}
 }
 const f={assets:'10000',debt:'0',windfall:'0',monthly_saving:'100',years:'2',return:'0',saving_growth:'0',withdrawals:'0',inflation:'No, future money'};assert.equal(projection(f),12400);assert.throws(()=>projection({...f,years:'many'}));assert.throws(()=>projection({...f,years:'1.5'}));assert.equal(projection({...f,inflation:'5%'}),11247);assert.throws(()=>projection({...f,inflation:'not sure'}));
 assert.equal(phraseSafety('Will my IVF succeed?'),'pregnancy');assert.equal(phraseSafety('Will I hurt myself again?'),'self_harm');assert.equal(phraseSafety('Will my plant die?'),undefined);
});
test('provider repairs once, then rejects malformed JSON',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:'{"category":"allow"'}}))};
 try {await assert.rejects(provider(()=>undefined).json('test',{}, {type:'object'},(x):x is object=>typeof x==='object'));assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
test('adaptive sports editions and learning targets stay tied to the question',async()=>{
 const {adaptPlan,learningTarget}=await import('../src/questions.ts');
 const p=planFor('Who wins the World Cup?',{});
 const nba=adaptPlan(p,{competition:'NBA championship'});assert.ok(nba.cards.find(c=>c.id==='team')?.options.some(o=>o.includes('Lakers')));assert.ok(!nba.cards.find(c=>c.id==='team')?.options.some(o=>o.includes('Argentina')));
 const women=adaptPlan(p,{competition:'Women’s World Cup'});assert.equal(women.cards.find(c=>c.id==='edition')?.options[0],'2027');assert.equal(adaptPlan(p,{competition:'Men’s World Cup'}).cards.find(c=>c.id==='edition')?.options[0],'2030');
 assert.deepEqual(learningTarget('Will I learn Danish in six months?'),{target:'Danish',language:true});assert.deepEqual(learningTarget('Will I learn to code in a year?'),{target:'coding',language:false});
});
test('explicit question horizons are preserved instead of asking conflicting defaults',()=>{
 const money=planFor('What will my net worth be in 10 years?',{});assert.equal(money.provided.years,'10');assert.ok(!money.cards.some(c=>c.id==='years'));
 const learning=planFor('Will I learn Spanish in six months?',{});assert.equal(learning.provided.deadline,'In 6 months');assert.ok(!learning.cards.some(c=>c.id==='deadline'));
 assert.equal(planFor('Will the stock move up?',{}).topic,'general');
});

test('a learned Spanish level never skips a different learning goal',()=>{const known={learning_target:'Spanish',level:'Intermediate',practice:'20 minutes',conversation:'Weekly'};assert.ok(!planFor('Will I learn Spanish?',known).cards.some(c=>c.id==='level'));assert.ok(planFor('Will I learn guitar?',known).cards.some(c=>c.id==='level'));});

test('prediction rejects missing topic inputs before generating an outcome',async()=>{const {predict}=await import('../server/engine.ts');let calls=0;const model={async json<T>(_system:string,_input:unknown,_schema:unknown,valid:import('../server/provider.ts').Validator):Promise<T>{calls++;const value={category:'allow'};if(await valid(value))return value as T;throw new Error('Unexpected outcome generation');}};const result=await predict('Will EVs lead global sales?',{goal:'Steady progress'},false,model);assert.equal(result.kind,'error');assert.equal(calls,1);});
test('creative and zodiac context cannot erase explicit personal harm or illness',()=>{assert.equal(phraseSafety('I am writing a song; will I commit suicide?'),'self_harm');assert.equal(phraseSafety('My horoscope says change: will my cancer come back?'),'illness');assert.equal(phraseSafety('Will my novel about a cancer survivor sell?'),undefined);});

test('multilingual lifespan, self-harm and residency forms retain their safety category',()=>{assert.equal(phraseSafety('¿Llegaré a cumplir los cincuenta?'),'death');assert.equal(phraseSafety('Klarer min far sig gennem vinteren?'),'death');assert.equal(phraseSafety('Bliver alting nemmere, hvis jeg bare ikke vågner i morgen?'),'self_harm');assert.equal(phraseSafety('Får jeg lov at blive i Danmark efter afslaget på min opholdstilladelse?'),'legal');});

test('asynchronous semantic rejection gets one repair and never leaks a failed result',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:'{"prediction":"An unsupported claim"}'}}))};try{await assert.rejects(provider(()=>undefined).json('test',{}, {type:'object'},async()=>({valid:false,feedback:'Contradicts the supplied facts'})));assert.equal(calls,2);}finally{globalThis.fetch=original;}});
test('server-owned horizon formats the model verdict without inventing an outcome',async()=>{const {formatForecast}=await import('../server/engine.ts');assert.equal(formatForecast('Your trip will be memorable.','Within 3 months'),'Your trip will be memorable within 3 months.');assert.equal(formatForecast('You will finish this year.','this year'),'You will finish this year.');assert.equal(formatForecast('Yes, your trip will be memorable.','3 months'),'Your trip will be memorable within 3 months.');assert.equal(formatForecast('No, you will not win.','within a year'),'You will not win within a year.');assert.equal(formatForecast('Your trip will be memorable.','3 months'),'Your trip will be memorable within 3 months.');assert.equal(formatForecast('You will not win.','within a year'),'You will not win within a year.');});
test('equivalent written horizons are not repeated in the headline',async()=>{const {formatForecast}=await import('../server/engine.ts');assert.equal(formatForecast('Your holiday will be memorable in three months.','Within 3 months'),'Your holiday will be memorable in three months.');});
test('Why labels assumptions and does not print the same sentence twice',async()=>{const {explainScenario}=await import('../server/engine.ts');assert.equal(explainScenario('Daily practice continues.','Daily practice continues.'),'Scenario assumption: Daily practice continues.');assert.equal(explainScenario('You practice daily.','Practice continues.'),'You practice daily. Scenario assumption: Practice continues.');});

test('Danish remaining-lifespan wording is death, not self-harm',()=>assert.equal(phraseSafety('Hvor mange år har min mor tilbage at leve i?'),'death'));
test('ordinary word senses do not trigger sensitive-topic phrase rules',()=>{for(const q of ['Will my arresting performance win an award?','Will I keep custody of the ball in the match?','Will our green card game night be fun?','Will the chart show two lines next month?'])assert.equal(phraseSafety(q),undefined);});
