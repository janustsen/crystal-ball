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
test('Why labels assumptions and does not print the same sentence twice',async()=>{const {explainScenario}=await import('../server/engine.ts');assert.equal(explainScenario('Daily practice continues.','Daily practice continues.'),'Scenario assumption: Daily practice continues.');assert.equal(explainScenario('You practice daily.','Practice continues.'),'You practice daily.\n\nScenario assumption: Practice continues.');});

test('Danish remaining-lifespan wording is death, not self-harm',()=>assert.equal(phraseSafety('Hvor mange år har min mor tilbage at leve i?'),'death'));
test('ordinary word senses do not trigger sensitive-topic phrase rules',()=>{for(const q of ['Will my arresting performance win an award?','Will I keep custody of the ball in the match?','Will our green card game night be fun?','Will the chart show two lines next month?'])assert.equal(phraseSafety(q),undefined);});

test('general planning does not send unrelated domain memories into model cards',async()=>{
 const {makePlan}=await import('../server/engine.ts');const original=globalThis.fetch;const inputs:unknown[]=[];
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));inputs.push(JSON.parse(body.messages[1].content));const content=body.format.properties.cards?{cards:[{question:'How much have you written?',options:['No draft','Half a draft','Full draft']},{question:'How often do you write?',options:['Daily','Weekly','Rarely']},{question:'What slows your writing?',options:['Time','Ideas','Editing']}]}:{category:'allow'};return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));};
 try{const result=await makePlan('Will I finish writing my novel this year?',{learning_target:'Spanish',assets:'25000'},provider(()=>undefined));assert.equal(result.kind,'ok');assert.ok(!JSON.stringify(inputs).includes('Spanish'));assert.ok(!JSON.stringify(inputs).includes('25000'));}finally{globalThis.fetch=original;}
});

test('duplicate model cards earn a repair instead of repeating the same question',async()=>{
 const {makePlan}=await import('../server/engine.ts');const original=globalThis.fetch;let drafts=0;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));let content:unknown={category:'allow'};if(body.format.properties.cards){drafts++;content={cards:[{question:'How much have you written?',options:['No draft','Half a draft','Full draft']},{question:drafts===1?'How much have you written?':'How often do you write?',options:['Daily','Weekly','Rarely']},{question:'What slows your writing?',options:['Time','Ideas','Editing']}]};}return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));};
 try{const result=await makePlan('Will I finish writing my novel this year?',{},provider(()=>undefined));assert.equal(result.kind,'ok');assert.equal(drafts,2);}finally{globalThis.fetch=original;}
});
test('learning explanation preserves the chosen baseline and conversational target',async()=>{
 const {predict}=await import('../server/engine.ts');const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content),content=input.choices?{prediction:input.choices[0]}:{category:'allow'};return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));};
 try{const result=await predict('Will I be conversational in Spanish in six months?',{level:'New beginner',practice:'30 minutes',conversation:'Weekly',deadline:'In 6 months'},false,provider(()=>undefined));assert.equal(result.kind,'ok');if(result.kind==='ok'){assert.match(result.value.headline,/conversational Spanish/);assert.match(result.value.why,/new beginner/);assert.doesNotMatch(result.value.why,/intermediate/);assert.match(result.value.why,/conversation practice/);assert.ok(!result.value.assumptions.some(a=>a.includes('News headlines')));}}finally{globalThis.fetch=original;}
 assert.equal(planFor('Will my side project gain customers?',{}).topic,'general');
});

test('bounded forecasts never replace the server explanation with extra model fields',async()=>{
 const {predict}=await import('../server/engine.ts');const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content),content=input.choices?{prediction:input.choices[0],reason:42,assumption:{untrusted:true}}:{category:'allow'};return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));};
 try{const result=await predict('How many users will my project have in four weeks?',{current_users:'100',weekly_growth:'2',growth_weeks:'4'},false,provider(()=>undefined));assert.equal(result.kind,'ok');if(result.kind==='ok')assert.match(result.value.why,/100.*2.*4.*108/);}finally{globalThis.fetch=original;}
});

test('general explanations quote an existing input and ignore model-authored factual prose',async()=>{
 const {predict}=await import('../server/engine.ts');const original=globalThis.fetch;let drafts=0;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));let content:unknown={category:'allow'};if(body.format.properties.prediction){drafts++;content={prediction:'You will finish your novel this year.',basis:drafts===1?'invented_fact':'context_1',assumption:'Your writing routine continues.',reason:'Invented factual prose must never appear.'};}else if(body.format.properties.valid)content={valid:true,issue:''};return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));};
 try{const result=await predict('Will I finish my novel this year?',{context_1:'Write 500 words daily',context_2:'3 chapters completed',context_3:'Weekly progress updates'},false,provider(()=>undefined));assert.equal(result.kind,'ok');assert.equal(drafts,2);if(result.kind==='ok'){assert.match(result.value.why,/Recorded context: Write 500 words daily/);assert.doesNotMatch(result.value.why,/Invented factual prose/);}}finally{globalThis.fetch=original;}
});

test('personal forecast voice normalizes model first-person phrasing',async()=>{
 const {formatForecast}=await import('../server/engine.ts');assert.equal(formatForecast('Yes, my next holiday will be memorable','Within 3 months'),'Your next holiday will be memorable within 3 months.');assert.equal(formatForecast('I will finish my novel this year.'),'You will finish your novel this year.');
});
