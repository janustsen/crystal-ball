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
function scripted(drafts:unknown[],feedback:string[]=[],inputs:unknown[]=[]):import('../server/provider.ts').ModelProvider{
 const json:Json=async(_system,_input,schema,valid)=>{
  if('category'in schema.properties)return {category:'allow'};
  if('safe'in schema.properties)return {safe:true};
  inputs.push(_input);
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

test('names are exempt from the feelings tripwire in both moment and why',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 for(const name of ['Desiree','Love','Lovisa','Désirée','Love-Anne']){
  const result=await bondReading({name},scripted([{why:`You and ${name} build a steady rhythm through shared projects.`,moment:`You and ${name} will cook together.`,horizon:'within 1 month'}]));
  assert.equal(result.kind,'ok',name);
 }
});

test('name exemptions retain feelings checks outside names and full semantic moderation',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 for(const draft of [
  {why:'You and Love build a steady rhythm through shared projects.',moment:'You and Love will fall for each other.'},
  {why:'Love secretly wishes for your company.',moment:'You and Love will cook together.'},
  {why:'Love loves spending every moment with you.',moment:'You and Love will cook together.'},
 ]){
  const feedback:string[]=[];
  const result=await bondReading({name:'Love'},scripted([{...draft,horizon:'within 1 month'},{...draft,horizon:'within 1 month'}],feedback));
  assert.equal(result.kind,'error');assert.match(feedback[0],/never anyone's feelings/);
 }
 const draft={why:'Love carries a torch for you.',moment:'You and Love will cook together.',horizon:'within 1 month'};
 let moderated=false;
 const json:Json=async(_system,input,schema,valid)=>{
  if('category'in schema.properties){moderated=true;assert.equal((input as {question:string}).question,`${draft.moment.slice(0,-1)} ${draft.horizon}. ${draft.why}`);return {category:'person'}}
  assert.equal(await valid(draft),true);return draft;
 };
 const result=await bondReading({name:'Love'},{json:json as import('../server/provider.ts').ModelProvider['json']});
 assert.equal(moderated,true);assert.equal(result.kind,'blocked');
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

test('the bond endpoint accepts Circle names with combining marks',async()=>{
 const {handler}=await import('../server/handler.ts');
 for(const name of ['आशा','Jose\u0301']){
  const serve=handler(()=>undefined,scripted([{why:'The two images bring a steady rhythm to shared projects.',moment:`You and ${name} will cook together.`,horizon:'within 1 month'}]));
  const response=await serve(new Request('http://localhost/',{method:'POST',body:JSON.stringify({action:'bond',question:bondQuestion(name),personName:name,ageConfirmed:true})}));
  const result=await response.json();
  assert.equal(result.kind,'ok',JSON.stringify(result));
  assert.equal(result.value.personName,name);
  assert.equal(result.value.question,bondQuestion(name));
  assert.equal(result.value.headline,`You and ${name} will cook together within 1 month.`);
 }
});

test('a bond with an opted-in Circle friend goes deeper with their sun sign and shared themes',async t=>{
 const {socialHandler}=await import('../server/social.ts');
 const env=(key:string)=>({SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only'} as Record<string,string>)[key];
 t.mock.method(globalThis,'fetch',async(input:unknown)=>{
  const path=new URL(String(input)).pathname;
  if(path==='/auth/v1/user')return Response.json({id:'0f0e0d0c-0b0a-4908-8706-050403020100'});
  if(path==='/rest/v1/social_profiles')return Response.json([{age_band:'adult'}]);
  if(path==='/rest/v1/rpc/authorize_friend_reading')return Response.json({sun_sign:'cancer',themes:['growth']});
  throw new Error(`Unexpected ${path}`);
 });
 const inputs:unknown[]=[],feedback:string[]=[],why='The Lantern and the Tide bring a steady rhythm to your shared garden.';
 const draft={why,moment:'You and Alex will plant a window herb garden.',horizon:'within 1 month'};
 const model=scripted([{...draft,why:'Leo’s warmth and Cancer’s steady rhythm shape your shared projects.'},draft],feedback,inputs);
 const serve=socialHandler(env,model);
 const ask=(localDate:unknown)=>serve(new Request('http://localhost/social',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({action:'friend',bond:true,question:bondQuestion('Alex'),firstName:'Alex',circle:'circle',member:'member',viewerBirthday:'2001-08-01',localDate})}));
 for(const invalid of ['2026-02-30','not-a-date',123,null]){
  const response=await ask(invalid);
  assert.equal(response.status,400);
  assert.equal((await response.json()).message,'Please provide a valid local calendar date.');
 }
 assert.equal(inputs.length,0);
 const response=await ask('2026-10-14');
 const reading=await response.json();
 assert.equal(response.status,200,JSON.stringify(reading));
 assert.deepEqual(reading.bond,bondOf('2001-08-01','Alex','cancer'));assert.equal(reading.bond.name,'The Lantern and the Tide');
 assert.equal(reading.headline,'You and Alex will plant a window herb garden within 1 month.');assert.equal(reading.label,'Your bond with Alex');
 assert.equal(reading.friend,true);assert.deepEqual(reading.friendTarget,{circle:'circle',member:'member',firstName:'Alex'});assert.equal(reading.dueDate,'2026-11-14');
 assert.equal(reading.why,why);assert.equal(feedback.length,1);assert.equal(feedback[0],"Refer to the bond's images, not zodiac sign names.");
 assert.equal((inputs[0] as {today:string}).today,'2026-10-14');
 assert.deepEqual((inputs[0] as {theirSunSign:string;sharedThemes:string[]}).theirSunSign,'cancer');assert.deepEqual((inputs[0] as {sharedThemes:string[]}).sharedThemes,['growth']);
});

test('a person named Leo is allowed in both paired-person forms without exempting sign references',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 for(const pair of ['You and Leo','Leo and you']){
  const draft={why:`${pair} build a steady rhythm through shared projects.`,moment:'You and Leo will cook together.',horizon:'within 1 month'};
  const result=await bondReading({name:'Leo'},scripted([draft]));
  assert.equal(result.kind,'ok',JSON.stringify(result));
  if(result.kind==='ok')assert.equal(result.value.headline,'You and Leo will cook together within 1 month.');
  for(const field of ['moment','why'])for(const sign of ['Leo','Cancer']){
   const feedback:string[]=[];
   const bad={...draft,[field]:field==='moment'?`You and Leo will paint ${sign}.`:`${pair} follow ${sign} through shared projects.`};
   const repaired=await bondReading({name:'Leo'},scripted([bad,draft],feedback));
   assert.equal(repaired.kind,'ok',JSON.stringify(repaired));
   assert.deepEqual(feedback,["Refer to the bond's images, not zodiac sign names."]);
   const rejected=await bondReading({name:'Leo'},scripted([bad,bad]));
   assert.equal(rejected.kind,'error');
  }
 }
});

test('all zodiac names in either draft field get one repair then fail closed',async()=>{
 const {bondReading}=await import('../server/bond.ts');
 const {validatedProvider}=await import('../server/provider.ts');
 for(const sign of ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'])for(const field of ['why','moment']){
  const draft={why:'The Lantern and the Tide guide your shared projects.',moment:'You and Alex will plant a shared garden.',horizon:'within 1 month',
   [field]:field==='why'?`${sign} guides your shared projects.`:`You and Alex will paint ${sign}.`};
  let attempts=0;
  const model=validatedProvider(async(messages)=>{
   attempts++;
   if(attempts===2)assert.ok(messages.at(-1)?.content.includes("Refer to the bond's images, not zodiac sign names."));
   return JSON.stringify(draft);
  });
  assert.equal((await bondReading({name:'Alex'},model)).kind,'error',`${sign} ${field}`);
  assert.equal(attempts,2);
 }
});

test('a Circle bond for a name that contains a filtered word still passes moderation',async t=>{
 const {socialHandler}=await import('../server/social.ts');
 const env=(key:string)=>({SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only'} as Record<string,string>)[key];
 t.mock.method(globalThis,'fetch',async(input:unknown)=>{
  const path=new URL(String(input)).pathname;
  if(path==='/auth/v1/user')return Response.json({id:'0f0e0d0c-0b0a-4908-8706-050403020100'});
  if(path==='/rest/v1/social_profiles')return Response.json([{age_band:'adult'}]);
  if(path==='/rest/v1/rpc/authorize_friend_reading')return Response.json({sun_sign:'aries',themes:[]});
  throw new Error(`Unexpected ${path}`);
 });
 const model=scripted([{why:'You and SHITAL find a steady rhythm in small shared plans.',moment:'You and Shital will plant a window herb garden.',horizon:'within 1 month'}]);
 const response=await socialHandler(env,model)(new Request('http://localhost/social',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({action:'friend',bond:true,question:bondQuestion('shital'),firstName:'shital',circle:'circle',member:'member'})}));
 const reading=await response.json();
 assert.equal(response.status,200,JSON.stringify(reading));
 assert.equal(reading.headline,'You and Shital will plant a window herb garden within 1 month.');
 assert.equal(reading.why,'You and SHITAL find a steady rhythm in small shared plans.');
 assert.equal(reading.friendTarget.firstName,'shital');
});

test('name exemption ignores case but retains name fragments inside words',async()=>{
 const {withoutName}=await import('../server/bond.ts');
 assert.equal(withoutName('Shital and SHITAL cook with shital.','shital','Friend'),'Friend and Friend cook with Friend.');
 assert.equal(withoutName('Shitalia Ashital Shitalé Shital\u0301','shital','Friend'),'shitalia ashital shitalé shital\u0301');
 assert.match(withoutName('Love loves a clover.','Love'),/loves a clover/i);
});
