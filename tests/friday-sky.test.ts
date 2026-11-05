import {appleFixture,nativeToken} from './apple-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import {openSky,skyWeek,skyWeeks} from '../server/sky';
import {deliverSocialPushes} from '../server/social-push';
import type {ModelProvider,JsonSchema} from '../server/provider';

const env=(key:string)=>({SUPABASE_URL:'http://db.local',SUPABASE_SERVICE_ROLE_KEY:'fixture',...appleFixture}[key as keyof typeof appleFixture|'SUPABASE_URL'|'SUPABASE_SERVICE_ROLE_KEY']);

test('the generated week is the Friday whose night is under way somewhere, else the next one',()=>{
 assert.equal(skyWeek(new Date('2026-10-08T12:00Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-09T05:59Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-10T23:59Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-11T00:00Z')),'2026-10-16');
});

test('each School and Circle gets one teen-moderated omen of that Friday’s real sky; unsafe output stays closed for the next run',async()=>{
 const saved:Record<string,unknown>[]=[],inputs:unknown[]=[],moderated:{text:string;teen:boolean;star:boolean}[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/sky_omen_targets')&&body.target_week==='2026-10-02')return Response.json([]);
  if(url.endsWith('/sky_omen_targets')){assert.equal(body.target_week,'2026-10-09');return Response.json([{school_id:'sfusd-lowell',circle_id:null},{school_id:null,circle_id:'circle-a'},{school_id:null,circle_id:'circle-b'}]);}
  if(url.endsWith('/save_sky_omen')){saved.push(body);return Response.json(null);}
  throw new Error(`Unexpected URL ${url}`);
 };
 let call=0;
 const model:ModelProvider={async json<T>(_system:string,input:unknown,schema:JsonSchema){
  const properties=schema.properties as Record<string,unknown>;
  if('safe'in properties){const value=input as {text:string;teenAudience:boolean;publicStar:boolean};moderated.push({text:value.text,teen:value.teenAudience,star:value.publicStar});return {safe:!value.text.includes('crush')} as T;}
  inputs.push(input);
  return {text:++call===3?'Your crush is thinking of you tonight.':' A bright shared spark gathers over all of you tonight. '} as T;
 }};
 assert.deepEqual(await openSky(env,model,new Date('2026-10-08T12:00Z'),transport),{week:'2026-10-09',targets:3,opened:2});
 const sky='waning Moon in Libra';
 assert.deepEqual(inputs,[{group:'school',sky},{group:'circle',sky},{group:'circle',sky}]);
 assert.ok(moderated.every(line=>line.teen&&line.star));
 assert.deepEqual(saved,[
  {target_week:'2026-10-09',school:'sfusd-lowell',circle:null,text_value:'A bright shared spark gathers over all of you tonight.'},
  {target_week:'2026-10-09',school:null,circle:'circle-a',text_value:'A bright shared spark gathers over all of you tonight.'},
 ]);
});

test('a Friday with the Moon in Cancer still opens its omen',async()=>{
 const saved:string[]=[],inputs:unknown[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/sky_omen_targets'))return Response.json(body.target_week==='2026-11-27'?[{school_id:'sfusd-lowell',circle_id:null}]:[]);
  if(url.endsWith('/save_sky_omen')){saved.push(body.text_value);return Response.json(null);}
  throw new Error(`Unexpected URL ${url}`);
 };
 const model:ModelProvider={async json<T>(_system:string,input:unknown,schema:JsonSchema){
  if('safe'in(schema.properties as Record<string,unknown>))return {safe:true} as T;
  inputs.push(input);return {text:'The waning Moon in Cancer hints at shared stories growing from quiet group moments.'} as T;
 }};
 assert.deepEqual(await openSky(env,model,new Date('2026-11-26T12:00Z'),transport),{week:'2026-11-27',targets:1,opened:1});
 assert.deepEqual(inputs,[{group:'school',sky:'waning Moon in Cancer'}]);
 assert.deepEqual(saved,['The waning Moon in Cancer hints at shared stories growing from quiet group moments.']);
});

test('a missed omen is retried for the still-open week before the upcoming Friday',async()=>{
 assert.deepEqual(skyWeeks(new Date('2026-10-11T00:00Z')),['2026-10-09','2026-10-16']);
 assert.deepEqual(skyWeeks(new Date('2026-10-08T23:59Z')),['2026-10-02','2026-10-09']);
 assert.deepEqual(skyWeeks(new Date('2026-10-09T05:00Z')),['2026-10-09']);
 assert.deepEqual(skyWeeks(new Date('2026-10-10T12:00Z')),['2026-10-09']);
 const asked:string[]=[],saved:string[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/sky_omen_targets')){asked.push(body.target_week);return Response.json(body.target_week==='2026-10-09'?[{school_id:null,circle_id:'circle-missed'}]:[{school_id:null,circle_id:'circle-new'}]);}
  if(url.endsWith('/save_sky_omen')){saved.push(`${body.target_week}:${body.circle}`);return Response.json(null);}
  throw new Error(`Unexpected URL ${url}`);
 };
 const model:ModelProvider={async json<T>(_system:string,_input:unknown,schema:JsonSchema){
  return ('safe'in(schema.properties as Record<string,unknown>)?{safe:true}:{text:'A bright shared spark gathers over all of you tonight.'}) as T;
 }};
 assert.deepEqual(await openSky(env,model,new Date('2026-10-11T00:00Z'),transport),{week:'2026-10-16',targets:2,opened:2});
 assert.deepEqual(asked,['2026-10-09','2026-10-16']);
 assert.deepEqual(saved,['2026-10-09:circle-missed','2026-10-16:circle-new']);
});

test('the Sky push is generic, opens the Sky and is acknowledged on its own lease',async()=>{
 const sent:Record<string,unknown>[]=[],finished:string[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/claim_social_pushes'))return Response.json([]);
  if(url.endsWith('/claim_sky_pushes'))return Response.json([{id:'sky-job',kind:'sky',token:nativeToken,circle_id:null}]);
  if(url.endsWith('/finish_sky_push')){finished.push(body.notification);return Response.json(null);}
  assert.equal(url,`https://api.sandbox.push.apple.com/3/device/${nativeToken}`);sent.push(body);return new Response(null,{status:200});
 };
 assert.deepEqual(await deliverSocialPushes(env,transport),{queued:1,accepted:1});
 assert.deepEqual(sent,[{aps:{alert:{title:'Crystal Ball',body:'The Sky is open.'},sound:'default'},body:{social:true,sky:true}}]);
 assert.deepEqual(finished,['sky-job']);
});
