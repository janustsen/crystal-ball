import test from 'node:test';
import assert from 'node:assert/strict';
import {openSky,skyWeek} from '../server/sky';
import {deliverSocialPushes} from '../server/social-push';
import type {ModelProvider,JsonSchema} from '../server/provider';

const env=(key:string)=>({SUPABASE_URL:'http://db.local',SUPABASE_SERVICE_ROLE_KEY:'fixture'}[key]);

test('the generated week is the Friday whose night is under way somewhere, else the next one',()=>{
 assert.equal(skyWeek(new Date('2026-10-08T12:00Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-09T05:59Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-10T23:59Z')),'2026-10-09');
 assert.equal(skyWeek(new Date('2026-10-11T00:00Z')),'2026-10-16');
});

test('each School and Circle gets one teen-moderated omen; unsafe output stays closed for the next run',async()=>{
 const saved:Record<string,unknown>[]=[],inputs:unknown[]=[],moderated:{text:string;teen:boolean;star:boolean}[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
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
 assert.deepEqual(inputs,[{group:'school'},{group:'circle'},{group:'circle'}]);
 assert.ok(moderated.every(line=>line.teen&&line.star));
 assert.deepEqual(saved,[
  {target_week:'2026-10-09',school:'sfusd-lowell',circle:null,text_value:'A bright shared spark gathers over all of you tonight.'},
  {target_week:'2026-10-09',school:null,circle:'circle-a',text_value:'A bright shared spark gathers over all of you tonight.'},
 ]);
});

test('the Sky push is generic, opens the Sky and is acknowledged on its own lease',async()=>{
 const sent:Record<string,unknown>[]=[],finished:string[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/claim_social_pushes'))return Response.json([]);
  if(url.endsWith('/claim_sky_pushes'))return Response.json([{id:'sky-job',kind:'sky',token:'ExpoPushToken[fixture]',circle_id:null}]);
  if(url.endsWith('/finish_sky_push')){finished.push(body.notification);return Response.json(null);}
  assert.equal(url,'https://exp.host/--/api/v2/push/send');sent.push(body);return Response.json({data:{status:'ok',id:'ticket'}});
 };
 assert.deepEqual(await deliverSocialPushes(env,transport),{queued:1,accepted:1});
 assert.deepEqual(sent,[{to:'ExpoPushToken[fixture]',title:'Crystal Ball',body:'The Sky is open.',data:{social:true,sky:true},sound:'default'}]);
 assert.deepEqual(finished,['sky-job']);
});
