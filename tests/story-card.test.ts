import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastCard,goldenSetCard,goldenShelf,receiptCard} from '../src/story-card.ts';
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
