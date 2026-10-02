import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import type {Facts,Plan,Prediction,Result} from '../src/types.ts';
async function main(){
const endpoint=process.env.VERIFY_ENGINE_URL||'http://127.0.0.1:8787';
const rows=[];
for(const question of ['What will my net worth be in 10 years?','Will I learn Spanish in six months?']){
 const started=performance.now();
 async function call<T>(action:'plan'|'predict',facts:Facts):Promise<Result<T>>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,question,facts,viewerBirthday:'1995-06-15'}),signal:AbortSignal.timeout(90000)});return response.json();
 }
 const plan=await call<Plan>('plan',{});assert.equal(plan.kind,'ok');if(plan.kind!=='ok')continue;
 assert.ok(plan.value.cards.length>=1&&plan.value.cards.length<=2);
 const facts={...plan.value.provided,...Object.fromEntries(plan.value.cards.map(c=>[c.id,`${c.question} ${c.options[0]}`]))};
 const forecast=await call<Prediction>('predict',facts);
 rows.push({question,plan,forecast,seconds:(performance.now()-started)/1000});
 await writeFile('docs/evidence/reading-short-forecast.json',JSON.stringify(rows,null,2));
 assert.equal(forecast.kind,'ok');if(forecast.kind==='ok'){assert.match(forecast.value.dueDate!,/^\d{4}-\d{2}-\d{2}$/);if(question.includes('net worth'))assert.doesNotMatch(forecast.value.headline,/[$€£]/);console.log(question,plan.value.cards.length,forecast.value.headline);}
}

}
void main();
