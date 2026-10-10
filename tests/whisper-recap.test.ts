import test from 'node:test';
import assert from 'node:assert/strict';
import {answerWhisper,keepWhisper,lastWhisper} from '../src/whisper';
import {weekRecap} from '../src/recap';
import type {Prediction} from '../src/types';

test('a whisper is kept once per day and only yesterday’s is asked about',()=>{
 let whispers=keepWhisper(undefined,'2026-10-04','By tonight, a plan may change.');
 assert.equal(keepWhisper(whispers,'2026-10-04','A second text for the same day.'),whispers,'the first whisper shown is the one checked');
 assert.equal(keepWhisper(whispers,'2026-02-30','Bad day.'),whispers);
 assert.equal(lastWhisper(whispers,'2026-10-04'),undefined,'today’s whisper is not checked until tomorrow');
 assert.equal(lastWhisper(whispers,'2026-10-05')?.day,'2026-10-04');
 assert.equal(lastWhisper(whispers,'2026-10-06'),undefined,'a skipped morning does not create a catch-up check');
 assert.equal(lastWhisper(whispers,'2026-10-12'),undefined);
 whispers=keepWhisper(whispers,'2026-10-05','By tonight, a message may arrive.');
 assert.equal(lastWhisper(whispers,'2026-10-06')?.day,'2026-10-05','only the latest whisper is asked about');
 whispers=answerWhisper(whispers,'2026-10-05','yes','2026-10-06');
 assert.deepEqual(whispers[0],{day:'2026-10-05',text:'By tonight, a message may arrive.',outcome:'yes',checkedInAt:'2026-10-06'});
 for(let day=1;day<=70;day++)whispers=keepWhisper(whispers,`2027-0${1+Math.floor((day-1)/28)}-${String((day-1)%28+1).padStart(2,'0')}`,'By tonight, something small.');
 assert.equal(whispers.length,60,'the log is bounded');
});

const reading=(createdAt:string,question:string,extra:Partial<Prediction>={}):Prediction=>({id:createdAt+question,createdAt,question,headline:'h',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false,...extra});
test('the weekly recap counts the last seven local days only and suggests a new area',()=>{
 const history=[
  reading('2026-10-11T09:00:00','Will I get the job promotion?',{golden:true}),
  reading('2026-10-06T09:00:00','Will my job interview go well?',{outcome:'no',checkedInAt:'2026-10-07'}),
  reading('2026-10-04T09:00:00','Will I learn Spanish?',{outcome:'yes',checkedInAt:'2026-10-10'}),
  reading('2026-10-08T09:00:00','Will our circle win?',{circleId:'c1'}),
 ];
 const whispers=[{day:'2026-10-10',text:'w',outcome:'yes' as const,checkedInAt:'2026-10-11'},{day:'2026-10-09',text:'w',outcome:'no' as const,checkedInAt:'2026-10-10'},{day:'2026-10-08',text:'w'},{day:'2026-10-01',text:'w',outcome:'yes' as const,checkedInAt:'2026-10-02'}];
 const recap=weekRecap(history,whispers,'2026-10-11');
 assert.deepEqual(recap,{from:'2026-10-05',to:'2026-10-11',readings:2,golden:1,landed:1,theme:'work',suggestion:'What personal goal will I grow into this year?'});
 assert.equal(weekRecap([],[],'2026-10-11').suggestion,'What personal goal will I grow into this year?');
 const busy=['Will I grow?','Will I learn piano?','Will my job change?','Will I move to Paris?'].map((q,i)=>reading(`2026-10-0${6+i}T09:00:00`,q));
 assert.equal(weekRecap(busy,[],'2026-10-11',true).suggestion,'What personal goal will I grow into this year?','teens are never pointed at love or money');
 assert.equal(weekRecap(busy,[],'2026-10-11').suggestion,'Will I find a deeper connection this year?');
});
