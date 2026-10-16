import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEdition,goldenOdds,isStyle,selectedStyle,styleCatalog,styleCatalogs} from '../src/delight';
import {dailyReadings,plusUnlocks} from '../src/billing';
import type {Prediction} from '../src/types';
const reading=(id:string):Prediction=>({id,question:'Will I finish?',headline:'You will finish.',createdAt:'2026-09-30',label:'Speculative forecast',why:'For fun',facts:{},sources:[],assumptions:[],friend:false});
test('free odds 1/50, Plus 1/10',()=>{
 let free=0,plus=0;
 for(let n=0;n<10000;n++){
  const p=reading(n.toString(16).padStart(8,'0')+'-abcd-4000-8000-000000000000');
  const f=assignEdition(p,false),paid=assignEdition(p,true);
  if(f.golden)free++;if(paid.golden)plus++;
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
test('the paywall lists every Plus unlock with the odds and allowance the app enforces',()=>{
 assert.deepEqual([goldenOdds(false),goldenOdds(true)],[50,10]);
 assert.ok(plusUnlocks.includes(`${dailyReadings(true)} questions a day`));
 assert.ok(plusUnlocks.some(u=>u.includes(`1 in ${goldenOdds(true)}`)&&u.includes(`1 in ${goldenOdds(false)}`)));
 for(const unlock of [/deeper Why/,/Inner Library/,/ball and card styles/,/sealed cards/])assert.ok(plusUnlocks.some(u=>unlock.test(u)),String(unlock));
});
test('the style catalog is the only source of style ids; Classic is the free style',()=>{
 assert.deepEqual(Object.keys(styleCatalog),['classic','gold','obsidian']);
 assert.deepEqual(Object.entries(styleCatalog).filter(([,s])=>!s.plus).map(([id])=>id),['classic']);
 for(const bad of ['rainbow','toString','__proto__',1,null])assert.equal(isStyle(bad),false);
 assert.deepEqual(Object.keys(styleCatalogs.ball),['classic','smoke','aurora','obsidian','gold']);
 assert.deepEqual(Object.keys(styleCatalogs.card),['classic','gold','obsidian']);
 for(const kind of ['ball','card'] as const){
  assert.deepEqual(Object.entries(styleCatalogs[kind]).filter(([,s])=>!s.plus).map(([id])=>id),['classic']);
  for(const bad of ['rainbow','toString','__proto__',1,null])assert.equal(isStyle(bad,kind),false);
 }
 assert.equal(isStyle('aurora','ball'),true);assert.equal(isStyle('aurora','card'),false);
});
