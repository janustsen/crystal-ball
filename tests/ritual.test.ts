import test from 'node:test';
import assert from 'node:assert/strict';
import {type Candidate,constellation,emptyRitual,markOpened,markStep,dayProgress,offerNotifications,registerNotifications,planNotifications,quiet,type Ritual} from '../src/ritual';
import {localDay} from '../src/retention';
import type {Prediction} from '../src/types';

const enabled=(time='08:30'):Ritual=>({...emptyRitual(),notify:{daily:true,time,offered:'2026-10-01'}});
const state=(ritual:Ritual,history:Prediction[]=[])=>({ritual,sunSign:'leo',history});
const now=new Date(2026,9,7,9,0);// a Wednesday morning
const at=(p:{at:Date})=>localDay(p.at);

test('a day lights one star when every step is done, and stars never reset',()=>{
 let r=markStep(emptyRitual(),'omen','2026-10-07');
 assert.equal(dayProgress(r,'2026-10-07').lit,1);assert.deepEqual(r.stars,[]);
 r=markStep(markStep(r,'ask','2026-10-07'),'ask','2026-10-07');
 assert.deepEqual(r.stars,['2026-10-07']);assert.equal(r.counts.fullDays,1);
 for(const day of ['2026-10-09','2026-10-12','2026-10-20','2026-11-01','2026-11-02','2026-11-03'])r=markStep(markStep(r,'omen',day),'ask',day);
 assert.equal(r.stars.length,7);
 const sky=constellation(r.stars.length);
 assert.equal(sky.collected,1);assert.equal(sky.lit,0);assert.deepEqual(sky.names,['Ursa Major']);assert.equal(sky.name,'Orion');
 assert.equal(constellation(3).lit,3);
});

test('the opt-in shows after the first forecast, once more on the third open day, then never on its own',()=>{
 let r=emptyRitual();
 assert.equal(offerNotifications(r,'home','2026-10-01'),false);
 assert.equal(offerNotifications(r,'reveal','2026-10-01'),true);
 r={...r,notify:{...r.notify,offered:'2026-10-01'},opened:['2026-10-01']};
 assert.equal(offerNotifications(r,'reveal','2026-10-01'),false);
 r=markOpened(r,'2026-10-02');assert.equal(offerNotifications(r,'home','2026-10-02'),false);
 r=markOpened(r,'2026-10-05');assert.equal(offerNotifications(r,'home','2026-10-05'),true);
 assert.equal(offerNotifications({...r,notify:{...r.notify,reoffered:true}},'home','2026-10-05'),false);
 assert.equal(offerNotifications({...r,notify:{...r.notify,daily:true}},'home','2026-10-05'),false);
});

test('notifications stay between 8am and 9pm, at most two a day, and back off to weekly',()=>{
 const plan=planNotifications(state(enabled()),now);
 const perDay=new Map<string,number>();for(const p of plan)perDay.set(at(p),(perDay.get(at(p))??0)+1);
 assert.ok([...perDay.values()].every(n=>n<=2));
 assert.ok(plan.every(p=>p.at.getHours()>=8&&p.at.getHours()<21));
 assert.equal(new Set(plan.map(p=>p.id)).size,plan.length);
 const offsets=(slot:string)=>plan.filter(p=>p.data.ritual===slot).map(p=>Math.round((new Date(at(p)+'T12:00').getTime()-new Date(2026,9,7,12).getTime())/86400000));
 assert.deepEqual(offsets('morning'),[1,2,3,5,7,14,21,28]);
 assert.deepEqual(offsets('evening'),[0,1,2,3]);
 assert.match(plan.find(p=>at(p)==='2026-10-14')!.body,/weekly/);
 assert.ok(quiet('21:00')&&quiet('07:59')&&!quiet('08:00')&&!quiet('20:59'));
});

test('morning copy never repeats within two weeks and never carries private text',()=>{
 const reading:Prediction={id:'r1',question:'Will my secret crush text me?',headline:'You will hear from them.',createdAt:'2026-10-01T10:00:00',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false,dueDate:'2026-10-09'};
 const plan=planNotifications(state({...enabled(),days:{}},[reading]),now,14);
 const mornings=plan.filter(p=>p.data.ritual==='morning').map(p=>p.body);
 assert.equal(new Set(mornings).size,mornings.length);
 assert.ok(plan.every(p=>!/crush|secret|hear from/i.test(p.body)));
 // The check-in already fires on its due day and three days later: those days keep the morning and drop the evening.
 assert.ok(!plan.some(p=>at(p)==='2026-10-09'&&p.data.ritual==='evening'));
 assert.ok(plan.some(p=>at(p)==='2026-10-09'&&p.data.ritual==='morning'));
});

test('a finished day drops its evening nudge; turning notifications off plans nothing',()=>{
 let r=enabled();r=markStep(markStep(r,'omen','2026-10-07'),'ask','2026-10-07');
 assert.ok(!planNotifications(state(r),now).some(p=>at(p)==='2026-10-07'));
 assert.deepEqual(planNotifications(state({...r,notify:{...r.notify,daily:false}}),now),[]);
 assert.ok(planNotifications(state(enabled()),new Date(2026,9,7,20,0)).every(p=>at(p)!=='2026-10-07'),'tonight’s 19:30 already passed');
});

test('another feature’s candidate wins its slot by priority and weekly beats survive back-off',()=>{
 const unregister=registerNotifications(({now}):Candidate[]=>[{day:localDay(new Date(now.getTime()+11*86400000)),slot:'evening',priority:1,title:'Crystal Ball',body:'Your week in the Ball is ready.',data:{recap:'1'} as Record<string,string>,time:'18:00',weekly:true},{day:localDay(new Date(now.getTime()+86400000)),slot:'morning',priority:1,title:'Crystal Ball',body:'Did it land?',data:{whisper:'1'} as Record<string,string>},{day:localDay(new Date(now.getTime()+86400000)),slot:'morning',priority:2,title:'Crystal Ball',body:'Too early',data:{},time:'07:00'}]);
 try{
  const plan=planNotifications(state(enabled()),now);
  assert.equal(plan.find(p=>at(p)==='2026-10-08'&&p.data.ritual!=='evening')?.body,'Did it land?');
  assert.equal(plan.find(p=>at(p)==='2026-10-18')?.body,'Your week in the Ball is ready.');
  assert.equal(plan.find(p=>at(p)==='2026-10-18')?.at.getHours(),18);
 }finally{unregister()}
 assert.ok(!planNotifications(state(enabled()),now).some(p=>p.data.recap),'unregistered sources stop planning');
});
