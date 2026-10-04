import test from 'node:test';
import assert from 'node:assert/strict';
import {settleCircleReading,circleReading} from '../src/reading-history.ts';
import {updateBirthday} from '../src/profile.ts';
import type {AccountState} from '../src/types.ts';
import type {CircleForecast} from '../src/social.ts';

const day=new Date().toISOString().slice(0,10);
const initial=():AccountState=>({onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:false,largeText:false});
const forecast=():CircleForecast=>({id:'forecast',asker_id:'asker',charged_at:null,circle_id:'circle',question:'Will we learn together?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:new Date().toISOString()});

for(const replacement of ['Forget everything','older backup restore'])test(`${replacement} never recharges or resurrects a Circle reading`,async()=>{
 let state=initial();const card=forecast();
 const persist=async(next:AccountState)=>{state=JSON.parse(JSON.stringify(next))};
 const mark=async()=>{card.charged_at=new Date().toISOString()};
 await settleCircleReading(state,card,persist,mark,true);
 assert.deepEqual(state.history,[circleReading(card)]);
 assert.equal(state.credits,1);
 state=replacement==='Forget everything'?updateBirthday({...state,facts:{},history:[]}):{...state,facts:{old:'backup'},history:[]};
 const replaced=state;
 await settleCircleReading(state,card,persist,mark);
 assert.strictEqual(state,replaced);
 assert.equal(state.credits,1);assert.deepEqual(state.history,[]);
});

test('failed marker and stale snapshots retry after restart without charging twice',async()=>{
 let state=initial();const card=forecast();
 const persist=async(next:AccountState)=>{state=JSON.parse(JSON.stringify(next))};
 await assert.rejects(settleCircleReading(state,card,persist,async()=>{throw Error('response lost')},true),/response lost/);
 assert.equal(state.credits,1);
 state=JSON.parse(JSON.stringify(updateBirthday({...state,facts:{},history:[]})));
 let marks=0;
 await settleCircleReading(state,card,persist,async()=>{marks++});
 await settleCircleReading(state,card,persist,async()=>{marks++},true);
 assert.equal(marks,2);assert.equal(state.credits,1);assert.deepEqual(state.history,[]);
});

test('recovery charges unpaid publication without history; failed local save never marks',async()=>{
 let state=initial(),marks=0;const card=forecast();
 await assert.rejects(settleCircleReading(state,card,async()=>{throw Error('disk failure')},async()=>{marks++}),/disk failure/);
 assert.equal(marks,0);assert.equal(state.credits,2);
 await settleCircleReading(state,card,async next=>{state=next},async()=>{marks++});
 assert.equal(marks,1);assert.equal(state.credits,1);assert.deepEqual(state.history,[]);
});

test('an existing saved forecast is marked without a second debit',async()=>{
 const card=forecast();let state={...initial(),history:[circleReading(card)]};
 await settleCircleReading(state,card,async next=>{state=next},async()=>{});
 assert.equal(state.credits,2);assert.equal(state.usage.count,1);
 assert.deepEqual(state.circleCharges,[card.id]);
});
