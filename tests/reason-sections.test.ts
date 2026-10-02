import test from 'node:test';
import assert from 'node:assert/strict';
import {validPrediction} from '../src/backup.ts';
import {predict} from '../server/engine.ts';
import {provider} from '../server/provider.ts';

test('producer-supplied reason sections survive storage and reject malformed backup sections',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const value=body.format.properties.prediction?{prediction:'You will finish a pottery bowl.',basis:'context_1',assumption:'Weekly practice continues.'}:{category:'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(value)}}));
 };
 try{
  const result=await predict('Will I finish a pottery bowl in three months?',{context_1:'I practise weekly.',horizon:'in three months'},false,provider(()=>undefined));
  assert.equal(result.kind,'ok');if(result.kind!=='ok')return;
  const saved=JSON.parse(JSON.stringify(result.value));
  assert.deepEqual(saved.reasonSections.map((s:{title:string})=>s.title),['Recorded context','Scenario assumption','Limits']);
  assert.equal(saved.reasonSections[0].body,'I practise weekly.');
  assert.equal(saved.reasonSections[1].body,'Weekly practice continues.');
  assert.match(saved.reasonSections[2].body,/No external evidence/);
  assert.equal(validPrediction(saved),true);
  assert.equal(validPrediction({...saved,reasonSections:[{title:'Context',body:42}]}),false);
  delete saved.reasonSections;assert.equal(validPrediction(saved),true);
 }finally{globalThis.fetch=original;}
});
