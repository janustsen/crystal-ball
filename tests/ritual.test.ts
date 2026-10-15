import test from 'node:test';
import assert from 'node:assert/strict';
import {type Candidate,checkInCandidates,pendingLimit,constellation,dailyCandidates,signCopy,emptyRitual,markOpened,markStep,dayProgress,offerNotifications,registerNotifications,planNotifications,quiet,type Ritual} from '../src/ritual';
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
 assert.deepEqual(r.stars,[]);
 r=markStep(r,'questions','2026-10-07',3);
 assert.deepEqual(r.stars,['2026-10-07']);assert.equal(r.counts.fullDays,1);
 for(const day of ['2026-10-09','2026-10-12','2026-10-20','2026-11-01','2026-11-02','2026-11-03'])r=markStep(markStep(markStep(r,'omen',day),'ask',day),'questions',day,3);
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
 assert.ok(!plan.some(p=>at(p)==='2026-10-09'&&p.data.ritual==='evening'));
 assert.ok(plan.some(p=>at(p)==='2026-10-09'&&p.data.ritual==='morning'));
});

test('a finished day drops its evening nudge; turning notifications off plans nothing',()=>{
 let r=enabled();r=markStep(markStep(markStep(r,'omen','2026-10-07'),'ask','2026-10-07'),'questions','2026-10-07',3);
 assert.ok(!planNotifications(state(r),now).some(p=>at(p)==='2026-10-07'));
 assert.deepEqual(planNotifications(state({...r,notify:{...r.notify,daily:false}}),now),[]);
 assert.ok(planNotifications(state(enabled()),new Date(2026,9,7,20,0)).every(p=>at(p)!=='2026-10-07'),'tonight’s 19:30 already passed');
});

test('another feature’s candidate wins its slot by priority and weekly beats survive back-off',()=>{
 const unregister=registerNotifications(({now}):Candidate[]=>[{id:'recap',day:localDay(new Date(now.getTime()+11*86400000)),slot:'evening',priority:1,title:'Crystal Ball',body:'Your week in the Ball is ready.',data:{recap:'1'} as Record<string,string>,time:'18:00',weekly:true},{id:'whisper',day:localDay(new Date(now.getTime()+86400000)),slot:'morning',priority:1,title:'Crystal Ball',body:'Did it land?',data:{whisper:'1'} as Record<string,string>},{id:'early',day:localDay(new Date(now.getTime()+86400000)),slot:'morning',priority:2,title:'Crystal Ball',body:'Too early',data:{},time:'07:00'}]);
 try{
  const plan=planNotifications(state(enabled()),now);
  assert.equal(plan.find(p=>at(p)==='2026-10-08'&&p.data.ritual!=='evening')?.body,'Did it land?');
  assert.equal(plan.find(p=>at(p)==='2026-10-18')?.body,'Your week in the Ball is ready.');
  assert.equal(plan.find(p=>at(p)==='2026-10-18')?.at.getHours(),18);
 }finally{unregister()}
 assert.ok(!planNotifications(state(enabled()),now).some(p=>p.data.recap),'unregistered sources stop planning');
});

for(const time of ['08:30','12:30','18:00'])test(`replanning retains today's ${time} omen only while it is in the future`,()=>{
 const [hour,minute]=time.split(':').map(Number),account=state(enabled(time));
 const before=new Date(2026,9,7,hour,minute-1),scheduled=new Date(2026,9,7,hour,minute);
 const morning=(when:Date)=>planNotifications(account,when).find(p=>p.id==='ritual-2026-10-07-morning');
 assert.equal(morning(new Date(2026,9,7,8))?.at.getTime(),scheduled.getTime());
 assert.equal(morning(before)?.at.getTime(),scheduled.getTime());
 assert.equal(morning(scheduled),undefined);
 assert.equal(morning(new Date(2026,9,7,hour,minute+1)),undefined);
});


test('check-ins group each day and share the evening budget before back-off',()=>{
 const reading:Prediction={id:'one',createdAt:'2026-10-01T12:00:00',dueDate:'2026-10-08',question:'Private',headline:'Private',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false};
 const history=[reading,{...reading,id:'two',friend:true},{...reading,id:'later',dueDate:'2027-09-01'},{...reading,id:'circle',circleId:'circle',dueDate:'2026-10-09'}];
 const unregister=registerNotifications(()=>[{id:'recap',day:'2026-10-08',slot:'evening',priority:1,title:'Recap',body:'Your week',data:{recap:'1'},time:'19:30'}]);
 try{
  const plan=planNotifications(state(enabled(),history),now);
  const counts=new Map<string,number>();for(const p of plan)counts.set(at(p),(counts.get(at(p))??0)+1);
  assert.ok([...counts.values()].every(n=>n<=2));
  assert.deepEqual(plan.filter(p=>p.data.checkIns).map(at),['2026-10-08']);
  assert.ok(plan.filter(p=>p.data.checkIns).every(p=>p.at.getHours()===19&&p.at.getMinutes()===30));
  assert.ok(plan.some(p=>p.data.recap));
  const after=planNotifications(state(enabled(),history.map(p=>({...p,outcome:'yes' as const}))),new Date(2026,9,8,19,31));
  assert.ok(!after.some(p=>at(p)==='2026-10-08'));
 }finally{unregister()}
});


test('the daily budget chooses the top two priorities across all slots',()=>{
 const unregister=registerNotifications(():Candidate[]=>[
  {id:'whisper',day:'2026-10-08',slot:'evening',priority:20,title:'Ball',body:'Whisper',data:{whisper:'1'},time:'18:00'},
  {id:'recap',day:'2026-10-08',slot:'evening',priority:10,title:'Ball',body:'Recap',data:{recap:'1'},time:'20:00'},
 ]);
 try{
  const due=planNotifications(state(enabled()),now).filter(p=>at(p)==='2026-10-08');
  assert.deepEqual(due.map(p=>p.body),['Whisper','Recap']);
  const delivered={'2026-10-08':['ritual-2026-10-08-morning']};
  const remaining=planNotifications(state(enabled('12:30')),new Date(2026,9,8,9),28,delivered).filter(p=>at(p)==='2026-10-08');
  assert.deepEqual(remaining.map(p=>p.body),['Whisper']);
  assert.equal(planNotifications(state(enabled()),now,28,{'2026-10-08':[due[0].id,due[1].id]}).filter(p=>at(p)==='2026-10-08').length,0);
 }finally{unregister()}
});


test('unopened check-ins and their follow-ups obey central back-off and quiet hours',()=>{
 const history:Prediction[]=Array.from({length:28},(_,i)=>({id:`due-${i}`,dueDate:localDay(new Date(2026,9,7+i)),createdAt:'2026-10-01T12:00:00',question:'Private',headline:'Private',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false}));
 const account=state(enabled(),history),plan=planNotifications(account,now);
 assert.deepEqual(plan.filter(p=>p.data.checkIns).map(at),['2026-10-07','2026-10-08','2026-10-09','2026-10-10']);
 assert.ok(plan.every(p=>p.at.getHours()>=8&&p.at.getHours()<21));
 const reopened=planNotifications(account,new Date(2026,9,21,9));
 assert.deepEqual(reopened.filter(p=>p.data.checkIns).map(at),['2026-10-21','2026-10-22','2026-10-23','2026-10-24']);
 const followUp=planNotifications(state(enabled(),[{...history[0],dueDate:'2026-10-08'}]),now);
 assert.deepEqual(followUp.filter(p=>p.data.checkIns).map(at),['2026-10-08']);
});

test('signed morning reminders rotate through every signed message',()=>{
 const mornings=dailyCandidates({state:state(enabled()),now,horizon:27}).filter(c=>c.id==='morning').map(c=>c.body);
 assert.deepEqual(new Set(mornings.filter(body=>signCopy('Leo').includes(body))),new Set(signCopy('Leo')));
});

test('a Love timing check-in names its own day, keeps the question private and falls back to plain copy three days later',()=>{
 const reading:Prediction={id:'love',timing:'love',question:'When will I meet someone special?',headline:'You will share a first coffee with someone new in 2 weeks.',createdAt:'2026-10-01T10:00:00',label:'Love timing',why:'',facts:{},sources:[],assumptions:[],friend:false,dueDate:'2026-10-09'};
 const candidates=checkInCandidates({state:state(enabled(),[reading]),now,horizon:14});
 assert.deepEqual(candidates.map(c=>[c.day,c.title]),[['2026-10-09','The day the Ball named'],['2026-10-12','Did it come true?']]);
 assert.ok(candidates.every(c=>!/someone special|coffee/i.test(`${c.title} ${c.body}`)));
 assert.ok(planNotifications(state({...enabled(),days:{}},[reading]),now,14).some(p=>at(p)==='2026-10-09'&&p.title==='The day the Ball named'));
});

test('the plan never exceeds the iOS pending limit, keeping the nearest Love timing dates',()=>{
 const start=new Date(2026,9,21,12);
 const history:Prediction[]=Array.from({length:80},(_,i)=>{const due=new Date(start);due.setDate(due.getDate()+i);return {id:`love-${i}`,timing:'love',dueDate:localDay(due),createdAt:'2026-10-07T09:00:00',question:'Private',headline:'Private',label:'Love timing',why:'',facts:{},sources:[],assumptions:[],friend:false}});
 const plan=planNotifications(state(enabled(),history),now);
 assert.equal(plan.length,pendingLimit);
 assert.ok(pendingLimit<64);
 const loveDays=plan.filter(p=>p.data.checkIns).map(p=>at(p));
 assert.equal(loveDays[0],'2026-10-21');
 assert.deepEqual(loveDays,[...loveDays].sort());
 assert.ok(plan.every((p,i)=>i===0||plan[i-1].at.getTime()<=p.at.getTime()));
});
