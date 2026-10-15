import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastCard,goldenSetCard,goldenShelf,omenCard,portraitCard,receiptCard,threeLightsCard,weekCard,yearCard} from '../src/story-card.ts';
import {sunSigns} from '../src/social-policy.ts';
import {weekRecap,yearRecap} from '../src/recap.ts';
import type {Prediction} from '../src/types.ts';
const reading=(over:Partial<Prediction>={}):Prediction=>({id:'0000000a-abcd-4000-8000-000000000000',question:'Will I learn to paint this year?',headline:'You will finish your course within 2 months.',createdAt:'2026-09-01T12:00:00Z',dueDate:'2026-10-20',label:'Speculative forecast',why:'Private reasoning',facts:{study:'Private answer'},sources:[],assumptions:[],friend:false,...over});

test('a receipt exists only for a personal Yes check-in',()=>{
 for(const outcome of [undefined,'no','pending'] as const)assert.equal(receiptCard(reading({outcome})),null);
 assert.equal(receiptCard(reading({outcome:'yes',circleId:'circle'})),null);
 assert.equal(receiptCard(undefined),null);
 const card=receiptCard(reading({outcome:'yes',checkedInAt:'2026-10-21'}))!;
 assert.equal(card.kind,'receipt');assert.deepEqual(card.headlines,['You will finish your course within 2 months.']);
 assert.equal(card.labels[0],'Learning');assert.match(card.labels[1],/^Sealed .*2026 · opened .*2026 · Yes$/);
});

test('a receipt shows dates and category, never the question, private answers or an accuracy score',()=>{
 const text=JSON.stringify(receiptCard(reading({outcome:'yes',checkedInAt:'2026-10-21',golden:true})));
 for(const hidden of ['paint this year','Private reasoning','Private answer','%','accuracy','score'])assert.ok(!text.includes(hidden),hidden);
});

test('the opened date is the check-in day and is omitted for older answers',()=>{
 const opened=(p:Prediction)=>receiptCard(p)!.labels[1];
 assert.notEqual(opened(reading({outcome:'yes',checkedInAt:'2026-10-21'})),opened(reading({outcome:'yes',checkedInAt:'2026-11-03'})));
 for(const dueDate of ['2026-10-20','2099-12-31',undefined]){
  const label=opened(reading({outcome:'yes',dueDate}));
  assert.match(label,/^Sealed .*2026 · Yes$/);
  assert.ok(!label.includes('opened'));
 }
});

test('every receipt retains category and dates without a disclaimer',()=>{
 for(const golden of [false,true])for(const checkedInAt of [undefined,'2026-10-21']){
  const card=receiptCard(reading({outcome:'yes',golden,checkedInAt}))!;
  assert.equal(card.kind,'receipt');assert.equal(card.golden,golden);
  assert.equal(card.labels.length,2);
  assert.equal(card.labels[0],'Learning');
  assert.match(card.labels[1],/^Sealed .* · Yes$/);
  assert.equal(card.labels[1].includes('opened'),checkedInAt!==undefined);
 }
});

test('a friend reading earns no receipt, even on Yes',()=>{
 assert.equal(receiptCard(reading({outcome:'yes',friend:true})),null);
 assert.equal(receiptCard(reading({outcome:'yes',friend:true,friendTarget:{circle:'circle',member:'member',firstName:'Ada'}})),null);
});

test('a Person reading earns no receipt, even on Yes',()=>{
 assert.equal(receiptCard(reading({outcome:'yes',personName:'Alex'})),null);
});

test('the golden shelf and set include only golden forecasts',()=>{
 assert.equal(goldenSetCard([reading()]),null);
 const golden=[1,2,3,4,5].map(n=>reading({id:`0000000${n}-abcd-4000-8000-000000000000`,headline:`Golden ${n} will arrive.`,golden:true}));
 const history=[reading({golden:false}),...golden];
 assert.deepEqual(goldenShelf(history).map(p=>p.headline),golden.map(p=>p.headline));
 const set=goldenSetCard(history)!;
 assert.equal(set.golden,true);assert.equal(set.labels[0],'5 golden forecasts');
 assert.deepEqual(set.headlines,['Golden 1 will arrive.','Golden 2 will arrive.','Golden 3 will arrive.']);assert.equal(set.footer,'+2 more on the golden shelf');
 assert.equal(goldenSetCard([golden[0]])!.labels[0],'1 golden forecast');
});

 test('story cards omit disclaimers for ordinary and golden readings, including legacy labels',()=>{
  for(const golden of [false,true]){
   const card=forecastCard(reading({golden}));
   assert.deepEqual(card.labels,[]);
   assert.deepEqual(card.headlines,[reading().headline]);
   assert.equal(card.golden,golden);
   assert.match(card.footer,/^Check back /);
  }
 });

test('three lights share only once Sun, Moon and rising are all lit, and only signs and lines',()=>{
 assert.equal(threeLightsCard({sunSign:'leo'}),null);
 assert.equal(threeLightsCard({sunSign:null,moonSign:'pisces',risingSign:'aries'}),null);
 for(const sun of sunSigns)for(const moon of sunSigns){
  const card=threeLightsCard({sunSign:sun,moonSign:moon,risingSign:sun})!;
  assert.equal(card.kind,'three-lights');
  assert.deepEqual(card.lights!.map(l=>l.name),['Sun','Moon','Rising']);
  assert.ok(card.lights!.every(l=>l.line&&l.line.length<=44&&l.sign),`${sun} ${moon}`);
  assert.notEqual(card.lights![0].line,card.lights![2].line);
 }
 const profile={sunSign:'leo',moonSign:'pisces',risingSign:'aries',birthday:'1998-08-01',birthTime:'14:30',birthPlace:'Lisbon, Portugal'};
 const text=JSON.stringify(threeLightsCard(profile));
 for(const hidden of ['1998','14:30','Lisbon','birthday','birthTime','birthPlace'])assert.ok(!text.includes(hidden),hidden);
});

test('week and year recaps share a playful label and counts, never questions, headlines or a score',()=>{
 const week=weekCard(weekRecap([reading({createdAt:'2026-10-12T12:00:00',question:'Will I find love soon?',golden:true}),reading({createdAt:'2026-10-13T12:00:00',question:'Will I meet someone kind?'})],[{day:'2026-10-12',text:'w',outcome:'yes',checkedInAt:'2026-10-13'}],'2026-10-14'))!;
 assert.equal(week.kind,'week');assert.deepEqual(week.headlines,['The Hopeful Romantic']);
 assert.deepEqual(week.labels,['Your week in the Ball','2 readings · 1 golden find · 1 whisper landed','Most on your mind: Love']);
 assert.equal(weekCard(weekRecap([],[{day:'2026-10-12',text:'w',outcome:'yes',checkedInAt:'2026-10-13'}],'2026-10-14'))!.headlines[0],'The Whisper Keeper');
 assert.equal(weekCard(weekRecap([reading({createdAt:'2026-09-01T12:00:00'})],[],'2026-10-14')),null,'a quiet week has nothing to share');
 const year=yearCard(yearRecap([reading({createdAt:'2026-12-02T12:00:00',outcome:'yes'}),reading({createdAt:'2026-03-02T12:00:00',outcome:'no'})],2026))!;
 assert.equal(year.kind,'year');assert.deepEqual(year.headlines,['The Eternal Student']);
 assert.deepEqual(year.labels,['Your 2026 in the Ball','2 readings · 1 Yes check-in','Most asked: Learning']);
 assert.equal(yearCard(yearRecap([],2026)),null);
 for(const card of [week,year]){const text=JSON.stringify(card);for(const hidden of ['love soon','someone kind','paint','within 2 months','Private','%','accuracy','score','miss'])assert.ok(!text.includes(hidden),hidden)}
});

test('a bond card shows two balls, the bond and its percentage, never the reasoning',()=>{
 const card=forecastCard(reading({question:'What lies ahead for me and Maya?',personName:'Maya',headline:'You and Maya will cook a new recipe together within 3 months.',bond:{name:'The Lantern and the Tide',percent:82}}));
 assert.deepEqual(card.pair,{name:'Maya',percent:82});assert.deepEqual(card.labels,['The Lantern and the Tide']);assert.equal(card.file,'crystal-ball-bond.png');
 for(const hidden of ['Private reasoning','Private answer'])assert.ok(!JSON.stringify(card).includes(hidden),hidden);
 assert.equal(forecastCard(reading()).pair,undefined);
});

test('the omen card carries the day and omen only; only a portrait insight becomes a portrait card',()=>{
 const omen=omenCard({day:'2026-10-14',text:'A small kindness returns to you today.'});
 assert.equal(omen.kind,'omen');assert.deepEqual(omen.headlines,['A small kindness returns to you today.']);assert.match(omen.labels[0],/^Daily omen · .*2026$/);
 const insight={kind:'portrait' as const,title:'The Quiet Cartographer',text:'You map a room before you speak in it.',at:'2026-10-14T09:00:00Z'};
 assert.deepEqual(portraitCard(insight),{kind:'portrait',golden:false,headlines:['The Quiet Cartographer'],body:'You map a room before you speak in it.',labels:[],footer:'A portrait by the Ball',file:'crystal-ball-portrait.png'});
 for(const kind of ['enjoy','try','shift'] as const)assert.equal(portraitCard({...insight,kind}),null);
});
