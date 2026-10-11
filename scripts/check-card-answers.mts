// Development-only semantic evaluation: supplied drafts, real local model judge.
// Run with npx tsx scripts/check-card-answers.mts; intentionally outside deterministic CI.
import assert from 'node:assert/strict';
import {makePlan} from '../server/engine.ts';
import {provider,validatedProvider} from '../server/provider.ts';
const judge=provider(key=>process.env[key]);
const cases:[string,string[],boolean][]=[
 ['What activity have you already chosen to do this year?',['Hiking with friends','Learning to cook','Reading a book'],true],
 ['What have you already booked?',['Two-day trip','A week away','A month abroad'],false],
 ['What have you already booked?',['One day trip','Two-day trip','No plans yet'],false],
 ['What have you already booked?',['Travel and stay','Just travel','Nothing yet'],true],
 ['How did your last practice session go?',['Drove 30 miles','Practiced with a mentor','Did 5 drills'],false],
 ['How did your last practice session go?',['It went well','It was okay','Missed a turn'],true],
 ['How did your last review go?',['Very well','Mixed','Not yet'],true],
 ['How many friends are going?',['Two','Three','Four or more'],true],
];
for(const [question,options,fits] of cases){
 let drafts=0,calls=0;
 const generator=validatedProvider(async()=>{drafts++;return JSON.stringify({cards:[{question,options}]})});
 const model:typeof judge={async json(system,input,schema,valid){
  const required=schema.required as string[];
  if(required.includes('cards'))return generator.json(system,input,schema,valid);
  if(required.includes('fits'))calls++;
  return judge.json(system,input,schema,valid);
 }};
 const result=await makePlan('Will the trip go well?',{},model);
 console.log(JSON.stringify({question,options,expected:fits,kind:result.kind,drafts,calls}));
 assert.equal(result.kind,fits?'ok':'error',question);
 assert.equal(drafts,fits?1:2,'Only one repair');
 assert.equal(calls,drafts,'One judge call per card');
}
