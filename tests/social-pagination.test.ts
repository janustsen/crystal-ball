import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {allRows} from '../src/social-pagination.ts';
import {settleCircleReading} from '../src/reading-history.ts';
import type {AccountState} from '../src/types.ts';

test('loadSocial includes every capped collection and recovers an unpaid forecast after row 1000',async t=>{
 const resources={reactions:'circle_reactions',seals:'sealed_forecasts',schools:'schools',requests:'circle_inbox',moments:'circle_moments',glows:'circle_glows',forecasts:'circle_forecasts',votes:'circle_vote_tallies',receivedSeals:'sealed_inbox'};
 const day=new Date().toISOString().slice(0,10);
 const rows=Array.from({length:1010},(_,i)=>({id:String(i).padStart(4,'0'),token:String(i).padStart(4,'0'),forecast_id:String(i).padStart(4,'0'),circle_id:`circle-${Math.floor(i/101)}`,day:new Date(Date.now()-(100-i%101)*86400000).toISOString().slice(0,10),target_id:String(i),user_id:'viewer',asker_id:'viewer',charged_at:i===1009?null:'2026-01-01',headline:'A shared skill may bring you together.',question:'Will we learn?',due_date:'2099-01-01',created_at:new Date().toISOString()}));
 let fail='';
 const datasets:Record<string,typeof rows>=Object.fromEntries([...Object.values(resources),'friend_notices'].map(name=>[name,rows.toReversed()]));
 function query(name:string){
  let from=0,to=999;const order:string[]=[];
  const builder={select:(_columns:string)=>builder,eq:()=>builder,order:(key:string)=>{order.push(key);return builder},range:(start:number,end:number)=>{from=start;to=end;return builder},then:(resolve:any,reject:any)=>{
   const sorted=[...(datasets[name]??[])].sort((a,b)=>{for(const key of order){const comparison=String((a as any)[key]).localeCompare(String((b as any)[key]));if(comparison)return comparison}return 0});
   return Promise.resolve(name===fail&&from>0?{data:null,error:{message:'page failed'}}:{data:sorted.slice(from,Math.min(to+1,from+1000)),error:null}).then(resolve,reject);
  }};return builder;
 }
 (globalThis as any).socialPaginationDb={from:query,rpc:query,auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}};
 const hooks=registerHooks({resolve(specifier,context,next){
  if(context.parentURL?.endsWith('/src/social.ts')){
   if(specifier==='./cloud')return {url:'data:text/javascript,export const anonymousOwner=async()=>"viewer";export const supabase=globalThis.socialPaginationDb;',shortCircuit:true};
   if(specifier==='./api')return {url:'data:text/javascript,export const aiProvider="",engineUrl="http://fixture",previewHeaders={};',shortCircuit:true};
  }
  if(context.parentURL?.includes('/src/')&&specifier.startsWith('./')&&!specifier.endsWith('.ts'))return next(new URL(specifier+'.ts',context.parentURL).href,context);
  return next(specifier,context);
 }});
 t.after(()=>{hooks.deregister();delete (globalThis as any).socialPaginationDb});
 t.mock.method(globalThis,'fetch',async()=>Response.json({ok:true}));
 const {loadSocial}=await import('../src/social.ts');
 const account={plus:true,ageBand:'adult' as const,sunSign:null};
 const snapshot=await loadSocial(account);
 for(const key of Object.keys(resources) as (keyof typeof resources)[])assert.equal(snapshot[key].length,1010,key);
 assert.equal(snapshot.notices,1010);
 assert.equal(new Set(snapshot.glows.map(g=>`${g.circle_id}/${g.day}`)).size,1010);
 assert.equal(snapshot.glows.filter(g=>g.day===day).length,10);
 const unpaid=snapshot.forecasts.filter(f=>f.asker_id===snapshot.owner&&f.charged_at===null);
 assert.deepEqual(unpaid.map(f=>f.id),['1009']);
 let state:AccountState={onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:false,largeText:false};
 const marked:string[]=[];
 for(const forecast of unpaid)await settleCircleReading(state,forecast,async next=>{state=next},async id=>{marked.push(id)});
 assert.equal(state.credits,1);assert.deepEqual(state.history,[]);assert.deepEqual(marked,['1009']);
 fail='circle_forecasts';await assert.rejects(loadSocial(account));
 fail='schools';assert.deepEqual((await loadSocial(account)).schools,[]);
});

test('pagination finishes exact page multiples and discards partial failures',async()=>{
 const rows=Array.from({length:1000},(_,i)=>i),offsets:number[]=[];
 const result=await allRows(async(from,to)=>{offsets.push(from);return {data:rows.slice(from,to+1),error:null}});
 assert.deepEqual(result.data,rows);assert.deepEqual(offsets,[0,500,1000]);
 const failed=await allRows(async(from,to)=>from?{data:null,error:'offline'}:{data:rows.slice(from,to+1),error:null});
 assert.deepEqual(failed,{data:null,error:'offline'});
});
