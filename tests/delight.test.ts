import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEdition,selectedStyle} from '../src/delight';
import type {Prediction} from '../src/types';
const reading=(id:string):Prediction=>({id,question:'Will I finish?',headline:'You will finish.',createdAt:'2026-09-30',label:'Speculative forecast',why:'For fun',facts:{},sources:[],assumptions:[],friend:false});
test('free odds 1/50, Plus 1/10; saved editions survive plan changes and JSON round trips',()=>{
 let free=0,plus=0;
 for(let n=0;n<10000;n++){
  const p=reading(n.toString(16).padStart(8,'0')+'-abcd-4000-8000-000000000000');
  const f=assignEdition(p,false),paid=assignEdition(p,true);
  if(f.golden)free++;if(paid.golden)plus++;
  assert.deepEqual(assignEdition(JSON.parse(JSON.stringify(f)),true),f);
  assert.deepEqual(assignEdition(JSON.parse(JSON.stringify(paid)),false),paid);
 }
 assert.equal(free,200);assert.equal(plus,1000);
 assert.equal(assignEdition(reading('legacy-reading'),true).golden,false);
});
test('style entitlement is checked at render time; saved premium choices cannot leak after downgrade',()=>{
 const state={plus:true,ballStyle:'obsidian' as const,cardStyle:'gold' as const};
 assert.equal(selectedStyle(state,'ball'),'obsidian');assert.equal(selectedStyle(state,'card'),'gold');
 assert.equal(selectedStyle({...state,plus:false},'ball'),'classic');assert.equal(selectedStyle({...state,plus:false},'card'),'classic');
 assert.equal(selectedStyle({plus:true},'ball'),'classic');
});
