import test from 'node:test';
import assert from 'node:assert/strict';
import {bondOf,bondQuestion} from '../src/bond.ts';

test('a bond is stable for the same two people and names both images',()=>{
 const bond=bondOf('2001-08-01','Maya');
 assert.deepEqual(bondOf('2001-08-01','Maya'),bond);
 assert.deepEqual(bondOf('2001-08-01','maya'),bond);
 assert.match(bond.name,/^The Lantern and the [A-Z][a-z]+$/);
 assert.equal(bondOf('2001-08-01','Maya','cancer').name,'The Lantern and the Tide');
});

test('the two images in a bond always differ',()=>{
 for(const name of ['Maya','Leo','Sam','Ana','Jo','Kai','Noor','Eli','Zoë','Ola','Ben','Ivy'])assert.doesNotMatch(bondOf('2001-08-01',name,'leo').name,/^The (\w+) and the \1$/);
 assert.equal(bondOf('2001-08-01','Maya','leo').name,'The Lantern and the Quill');
});

test('the percentage stays kind and a shared element raises it',()=>{
 const names=Array.from({length:200},(_,i)=>`Name${i}`);
 for(const name of names)for(const sign of [undefined,'aries','cancer','leo']){const {percent}=bondOf('2001-08-01',name,sign);assert.ok(Number.isInteger(percent)&&percent>=64&&percent<=98,`${name} ${percent}`)}
 assert.equal(bondOf('2001-08-01','Maya','aries').percent-bondOf('2001-08-01','Maya').percent,8);
 assert.equal(bondOf('2001-08-01','Maya','gemini').percent-bondOf('2001-08-01','Maya').percent,5);
 assert.equal(bondOf(undefined,'Maya','aries').percent,bondOf(undefined,'Maya').percent);
});

test('the bond question names the person',()=>assert.equal(bondQuestion('Maya'),'What lies ahead for me and Maya?'));

type Json=(system:string,input:unknown,schema:{properties:Record<string,unknown>},valid:import('../server/provider.ts').Validator)=>Promise<unknown>;
// A scripted model: safety calls allow; bond drafts come from the queue and must pass the validator, like the provider.
function scripted(drafts:unknown[],feedback:string[]=[]):import('../server/provider.ts').ModelProvider{
 const json:Json=async(_system,_input,schema,valid)=>{
  if('category'in schema.properties)return {category:'allow'};
  for(const draft of drafts.splice(0,2)){const verdict=await valid(draft);if(verdict===true)return draft;if(typeof verdict==='object')feedback.push(verdict.feedback)}
  throw new Error('The mist is too thick. Please ask again.');
 };
 return {json:json as import('../server/provider.ts').ModelProvider['json']};
}

test('a bond reading forecasts a shared moment with a due date, a named bond and a percentage',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 const result=await bondReading({name:'Maya'},scripted([{why:'The Lantern lights the way while the Tide keeps you both moving.',moment:'You and Maya will cook a new recipe together.',horizon:'within 3 months'}]),{viewerBirthday:'2001-08-01',localDate:'2026-10-14'});
 assert.equal(result.kind,'ok');if(result.kind!=='ok')return;
 const reading=result.value;
 assert.equal(reading.headline,'You and Maya will cook a new recipe together within 3 months.');
 assert.equal(reading.dueDate,'2027-01-14');
 assert.deepEqual(reading.bond,bondOf('2001-08-01','Maya'));
 assert.equal(reading.question,bondQuestion('Maya'));assert.equal(reading.personName,'Maya');assert.equal(reading.friend,false);
});

test('a bond reading never reads the other person’s feelings: such a draft is repaired, then fails closed',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 const feedback:string[]=[];
 const feelings={why:'Maya secretly thinks about you every day.',moment:'You and Maya will fall for each other.',horizon:'within 1 month'};
 const result=await bondReading({name:'Maya'},scripted([feelings,feelings],feedback),{});
 assert.equal(result.kind,'error');
 assert.match(feedback[0],/never anyone's feelings/);
});

test('the engine serves a bond only for a first name',async()=>{
 const {handler}=await import('../server/handler.ts');
 const serve=handler(()=>undefined,scripted([{why:'The Lantern and the Tide find their rhythm in small plans.',moment:'You and Maya will finish a shared playlist.',horizon:'within 1 month'}]));
 const ask=(body:object)=>serve(new Request('http://localhost/',{method:'POST',body:JSON.stringify({action:'bond',question:bondQuestion('Maya'),facts:{},ageConfirmed:true,localDate:'2026-10-14',...body})})).then(r=>r.json());
 assert.equal((await ask({})).message,'Use a first name only.');
 assert.equal((await ask({personName:'Maya Lee'})).message,'Use a first name only.');
 const reading=await ask({personName:'Maya'});
 assert.equal(reading.kind,'ok');assert.equal(reading.value.headline,'You and Maya will finish a shared playlist within 1 month.');assert.equal(typeof reading.value.bond.percent,'number');
});
