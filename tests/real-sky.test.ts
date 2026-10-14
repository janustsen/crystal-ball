import test from 'node:test';
import assert from 'node:assert/strict';
import {moonSvg,skyLine,skyOn} from '../src/real-sky.ts';
import {personalOmen} from '../server/omen.ts';
import type {ModelProvider} from '../server/provider.ts';

test('the sky is the real one, and each event falls on exactly one day',()=>{
 assert.equal(skyLine(skyOn('2026-10-14')),'waxing Moon in Sagittarius');
 const events:Record<string,string>={};
 for(let day=Date.parse('2026-10-01');day<Date.parse('2026-12-01');day+=864e5){const date=new Date(day).toISOString().slice(0,10),event=skyOn(date).event;if(event)events[date]=event;}
 // Published 2026 dates: new moons 10 Oct and 9 Nov, full moons 26 Oct and 24 Nov, Mercury stations retrograde 24 Oct.
 assert.deepEqual(events,{'2026-10-10':'new-moon','2026-10-24':'mercury-retrograde','2026-10-26':'full-moon','2026-11-09':'new-moon','2026-11-24':'full-moon'});
 assert.equal(skyLine(skyOn('2026-10-26')),'full Moon in Taurus, Mercury retrograde');
 assert.equal(skyLine(skyOn('2026-10-20')).split(',')[0].split(' ')[0],'waxing');
 assert.equal(skyLine(skyOn('2026-11-01')).split(' ')[0],'waning');
});

test('the drawn moon is lit from the right while waxing and fills at full',()=>{
 assert.match(moonSvg(180,'#fff'),/A1\.000,1 0 0 1 0,-1Z"/);
 assert.match(moonSvg(45,'#fff'),/A0\.707,1 0 0 0 0,-1Z"/);
 assert.doesNotMatch(moonSvg(45,'#fff'),/scale/);
 assert.match(moonSvg(300,'#fff'),/scale\(-1,1\)/);
});

test('the omen reads the day’s real sky and may name the Moon’s sign beside the Sun sign',async()=>{
 const inputs:unknown[]=[];
 const model:ModelProvider={async json<T>(_system:string,input:unknown,_schema:unknown,validate?:(value:unknown)=>unknown){
  inputs.push(input);
  const value={text:'Gemini, tonight’s full Moon in Taurus lights a path you already know.',whisper:'By tonight, a small plan may change for the better.'};
  assert.equal(validate?.(value),true);
  return value as T;
 }};
 await personalOmen({sun_sign:'gemini'},model,skyOn('2026-10-26'));
 assert.deepEqual(inputs,[{sunSign:'gemini',sky:'full Moon in Taurus, Mercury retrograde',skyEvent:'Full Moon',facts:{sun_sign:'gemini'}}]);
});
