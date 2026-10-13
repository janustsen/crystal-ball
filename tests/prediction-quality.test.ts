import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,predict} from '../server/engine.ts';
import {validatedProvider} from '../server/provider.ts';

test('planning repair receives the judge reason and can rewrite a list question',async()=>{
 const reason='The question asks for top three goals, but each option supplies only one goal.';
 const drafts=[
  {cards:[{factor:'current goals',question:'What are your top three goals this year?',options:['study for exams','work part time','travel abroad']}]},
  {cards:[{factor:'current commitments',question:'What takes up most of your week?',options:['School','Paid work','Caregiving']}]},
 ];
 let attempts=0,judgeCalls=0,repair='';
 const model=validatedProvider(async(messages,schema)=>{
  const fields=schema.properties as Record<string,unknown>;
  if(fields.cards){
   if(attempts===1)repair=messages.at(-1)!.content;
   return JSON.stringify(drafts[attempts++]);
  }
  if(fields.fits)return JSON.stringify({reason:judgeCalls++===0?reason:'All options name a current commitment.',fits:judgeCalls>1});
  return JSON.stringify({category:'allow'});
 });
 const result=await makePlan('what will my life be like next year?',{},model);
 assert.equal(result.kind,'ok',JSON.stringify(result));
 assert.equal(attempts,2);
 assert.ok(repair.includes(reason),repair);
 assert.match(repair,/rewrite.*question/i);
 if(result.kind==='ok')assert.deepEqual(result.value.cards[0].options,['School','Paid work','Caregiving','Other']);
});

test('prediction emits instructions for an unstated inference and a named event',async()=>{
 let prompt='';
 const model=validatedProvider(async(messages,schema)=>{
  if((schema.properties as Record<string,unknown>).prediction){
   prompt=messages[0].content;
   return JSON.stringify({insight:'You treat creative time as something to earn after helping others, so protecting it starts with a boundary.',basis:'context_1',prediction:'You will turn down an extra shift to finish a canvas.'});
  }
  return JSON.stringify({category:'allow'});
 });
 const result=await predict('what will my life be like next year?',{context_1:'I want more time for painting but keep accepting extra work',horizon:'next year'},false,model);
 assert.equal(result.kind,'ok',JSON.stringify(result));
 // This is the emitted model instruction contract, not proof of model interpretation.
 assert.match(prompt,/Never restate a fact or tension the person stated outright/);
 assert.match(prompt,/add one inference beyond their words/);
 assert.match(prompt,/Name the actual activity, decision or milestone/);
 assert.match(prompt,/[Aa] new project/);
 assert.match(prompt,/Name the deliverable itself/);
});


test('unrepairable planning mismatches still fail closed after two drafts',async()=>{
 let drafts=0;
 const model=validatedProvider(async(_messages,schema)=>{
  const fields=schema.properties as Record<string,unknown>;
  if(fields.cards){
   drafts++;
   return JSON.stringify({cards:[{question:'What are your top three goals this year?',options:['Study for exams','Work part time','Travel abroad']}]});
  }
  if(fields.fits)return JSON.stringify({reason:'Each option gives one goal instead of three.',fits:false});
  return JSON.stringify({category:'allow'});
 });
 const result=await makePlan('what will my life be like next year?',{},model);
 assert.equal(result.kind,'error');
 assert.equal(drafts,2);
});

test('a decoder-truncated prediction is repaired once or fails closed',async()=>{
 const truncated="You will start a weekly cooking challenge with your sister using recipes from your mom's 1";
 const complete='You will cook a family recipe with your sister.';
 const facts={context_1:'I keep stopping evening classes after the first week',context_2:'I work early mornings and spend weekends with my sister',horizon:'next year'};
 for(const repair of [complete,truncated]){
  let attempts=0;
  const model=validatedProvider(async(_messages,schema)=>{
   if((schema.properties as Record<string,unknown>).prediction){
    return JSON.stringify({basis:'context_1',insight:'Shared activities give you a commitment that fits around early mornings.',prediction:attempts++===0?truncated:repair});
   }
   return JSON.stringify({category:'allow'});
  });
  const result=await predict('what will my life be like next year?',facts,false,model);
  assert.equal(result.kind,repair===complete?'ok':'error',JSON.stringify(result));
  assert.equal(attempts,2);
  if(result.kind==='ok')assert.equal(result.value.headline,'You will cook a family recipe with your sister next year.');
 }
});

test('prediction length bounds still apply after unconstrained decoding',async()=>{
 const prediction='You will write your family recipes into a cookbook with your sister for her next birthday.';
 assert.equal(prediction.length,90);
 for(const [draft,horizon,kind] of [
  [prediction,'within seven months','ok'],
  [prediction.replace('write','compile'),'within seven months','error'],
  [prediction,'within 100000 months','error'],
 ] as const){
  let attempts=0;
  const model=validatedProvider(async(_messages,schema)=>{
   if((schema.properties as Record<string,unknown>).prediction){
    attempts++;
    return JSON.stringify({basis:'context_1',insight:'A shared activity gives your family time a lasting result.',prediction:draft});
   }
   return JSON.stringify({category:'allow'});
  });
  const result=await predict('What will my life be like?',{context_1:'I spend weekends cooking with my sister',horizon},false,model);
  assert.equal(result.kind,kind,JSON.stringify(result));
  assert.equal(attempts,kind==='ok'?1:2);
  if(result.kind==='ok')assert.equal(result.value.headline.length,110);
 }
});
