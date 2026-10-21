import test from 'node:test';
import assert from 'node:assert/strict';
import {countLabel,freeLeft,readingsLeft} from '../src/billing.ts';
import {fresh,homeStep,ladder,openFeature,opensAt,questionsAsked,unlocked,type Feature} from '../src/ladder.ts';
import {circleReading,localStarter,saveReading} from '../src/reading-history.ts';
import type {AccountState} from '../src/types.ts';

const day='2026-10-15';
const fresh0:AccountState={sunSign:null,ageBand:'adult',ageConfirmed:true,onboardingDone:true,ladder:{asked:0,opened:[]},facts:{},history:[],credits:0,plus:false,usage:{day,count:0},reduceMotion:false};
const reading=(n:number)=>({...circleReading({id:`r${n}`,circle_id:'c',asker_id:'me',charged_at:null,question:'Will I?',headline:'Maybe.',due_date:'2099-01-01',created_at:'2026-10-15T00:00:00Z'}),circleId:undefined});
let ids=0;
const ask=(s:AccountState,times:number,on=day)=>{for(let i=0;i<times;i++)s=saveReading(s,reading(ids++),on);return s};
const features=ladder.map(l=>l.feature);
const open=(s:AccountState)=>features.filter(f=>unlocked(s,f));

test('a new account opens one feature at 1, 3, 5, 8, 12 and 20 questions, each with a dot until tapped',()=>{
 let s=fresh0;
 assert.deepEqual(open(s),[]);
 const expected:Record<number,Feature[]>={1:['history'],3:['history','about'],5:['history','about','insight'],8:['history','about','insight','bond'],12:['history','about','insight','bond','sky'],20:features};
 for(let asked=1;asked<=20;asked++){
  assert.equal(opensAt(asked-1)?.at,expected[asked]?asked:undefined,`question ${asked}`);
  s=ask(s,1);
  if(expected[asked])assert.deepEqual(open(s),expected[asked],`after ${asked}`);
 }
 assert.deepEqual(features.filter(f=>fresh(s,f)),features,'every opened feature waits with a dot');
 s=openFeature(s,'history');
 assert.equal(fresh(s,'history'),false);assert.equal(unlocked(s,'history'),true);
 assert.strictEqual(openFeature(s,'history'),s,'opening twice changes nothing');
});

test('Forget everything keeps opened features; purchases do not bypass question thresholds',()=>{
 const asked=ask(fresh0,8),forgot={...asked,history:[]};
 assert.equal(questionsAsked(forgot),8);assert.deepEqual(open(forgot),open(asked));
 const plus={...fresh0,plus:true};
 assert.deepEqual(open(plus),[]);assert.deepEqual(features.filter(f=>fresh(plus,f)),[],'Plus gets no dots for what the count has not opened');
 assert.deepEqual(open({...fresh0,yearAhead:{kind:'owned',source:'purchase'}}),[]);
 // A restored archive counts toward the ladder even when this device asked fewer.
 assert.equal(questionsAsked({ladder:{asked:2,opened:[]},history:Array.from({length:6},(_,i)=>reading(i))}),6);
});

test('Home’s next step: something new, then a check-in, then tomorrow, the last starter questions, then what comes next',()=>{
 const base={remaining:5,starter:5,checkIn:false};
 assert.deepEqual(homeStep(fresh0,base),{kind:'next',step:ladder[0],left:1});
 const one=ask(fresh0,1);
 assert.equal(homeStep(one,{...base,checkIn:true})?.kind,'new');
 const seen=openFeature(one,'history');
 assert.equal(homeStep(seen,{...base,checkIn:true})?.kind,'check-in');
 assert.deepEqual(homeStep(seen,base),{kind:'next',step:ladder[1],left:2});
 assert.deepEqual(homeStep(seen,{...base,starter:2,remaining:2}),{kind:'starter',left:2});
 assert.deepEqual(homeStep(seen,{...base,starter:0,remaining:0}),{kind:'tomorrow'});
 // The insight and Sky carry their dot on Home itself, so the card moves on to what comes next.
 const five=openFeature(openFeature(ask(fresh0,5),'history'),'about');
 assert.equal(fresh(five,'insight'),true);assert.deepEqual(homeStep(five,base),{kind:'next',step:ladder[3],left:3});
 const all={...fresh0,ladder:{asked:20,opened:features}};
 assert.equal(homeStep(all,{...base,starter:0,remaining:1}),null,'nothing left to say');
 assert.equal(homeStep({...all,plus:true},{...base,starter:0,remaining:0}),null,'Plus is never told to wait for tomorrow');
});

test('the device starter: 20 free questions, then 1 a day, with packs after the free one; Plus keeps 10 a day',()=>{
 let s={...fresh0,credits:3};
 s=ask(s,20);
 assert.equal(s.credits,3,'the first 20 spend no pack');assert.equal(localStarter(s),0);
 assert.equal(freeLeft({plus:false,starter:0,used:s.usage.count}),0,'no daily question on a starter day');
 s=ask(s,1);assert.equal(s.credits,2,'the 21st uses a pack');
 const tomorrow=ask(s,1,'2026-10-16');
 assert.equal(tomorrow.credits,2,'the next day brings one free question');
 assert.equal(ask(tomorrow,1,'2026-10-16').credits,1);
 assert.equal(freeLeft({plus:true,starter:20,used:4}),6,'Plus spends its daily 10, not the starter');
 assert.equal(readingsLeft({plus:false,packs:2,used:7,starter:13}),15);
 assert.equal(readingsLeft({plus:false,packs:2,used:1}),2,'an older server without starter keeps the daily rule');
});

test('the header pill names the free starter, then today’s free question, and totals once packs exist',()=>{
 assert.equal(countLabel({plus:false,starter:20,packs:0,remaining:20}),'20 free questions');
 assert.equal(countLabel({plus:false,starter:1,packs:0,remaining:1}),'1 free question');
 assert.equal(countLabel({plus:false,starter:0,packs:0,remaining:1}),'1 free today');
 assert.equal(countLabel({plus:false,starter:0,packs:0,remaining:0}),'0 free today');
 assert.equal(countLabel({plus:false,starter:3,packs:5,remaining:8}),'8 questions left');
 assert.equal(countLabel({plus:true,starter:0,packs:5,remaining:15}),'Plus');
});

for(const purchase of [{plus:true},{yearAhead:{kind:'owned' as const,source:'purchase' as const}}])test(`purchased features retain every threshold: ${JSON.stringify(purchase)}`,()=>{
 for(const rung of ladder){
  const before={...fresh0,...purchase,ladder:{asked:rung.at-1,opened:[]}};
  assert.equal(unlocked(before,rung.feature),false);
  assert.equal(fresh(before,rung.feature),false);
  const after=ask(before,1);
  assert.equal(unlocked(after,rung.feature),true);
  assert.equal(fresh(after,rung.feature),true);
 }
 assert.equal(homeStep({...fresh0,...purchase},{remaining:10,starter:20,checkIn:false})?.kind,'next');
});
