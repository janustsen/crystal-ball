// Against the owned loopback server only: ENGINE_URL=http://127.0.0.1:8796 npx tsx scripts/measure-codex.ts
import {writeFile,mkdir} from 'node:fs/promises';
import {adaptPlan} from '../src/questions.ts';
import type {Facts,Plan,Prediction,Result} from '../src/types.ts';
async function main(){
 const endpoint=process.env.ENGINE_URL||'http://127.0.0.1:8796';
 const url=new URL(endpoint);if(url.hostname!=='127.0.0.1')throw new Error('Loopback server required.');
 const health=await(await fetch(`${endpoint}/health`)).json();if(health.provider!=='codex')throw new Error('Expected the real Codex development server.');
 const rows=[];
 for(const question of ['What will my net worth be in 10 years?','Will I be conversational in Spanish in six months?','Will I finish writing my novel this year?']){
  const call=async<T>(action:string,facts:Facts):Promise<Result<T>>=>(await(await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,question,facts,friend:false}),signal:AbortSignal.timeout(120000)})).json());
  const start=performance.now(),plan=await call<Plan>('plan',{}),planned=performance.now();
  const facts=plan.kind==='ok'?{...Object.fromEntries(adaptPlan(plan.value,plan.value.provided).cards.map(c=>[c.id,plan.value.topic==='general'&&c.id.startsWith('context_')?`${c.question} ${c.options[0]}`:c.options[0]])),...plan.value.provided}:{};
  const result=plan.kind==='ok'?await call<Prediction>('predict',facts):plan;
  rows.push({question,plan,facts,result,planningSeconds:(planned-start)/1000,predictionSeconds:(performance.now()-planned)/1000,totalSeconds:(performance.now()-start)/1000});
  console.log(question,result.kind,rows.at(-1)?.totalSeconds.toFixed(2));
 }
 await mkdir('docs/evidence/codex',{recursive:true});await writeFile('docs/evidence/codex/latency.json',JSON.stringify({at:new Date().toISOString(),model:process.env.CODEX_MODEL||'gpt-6-luna',rows},null,2));
 if(rows.some(r=>r.result.kind!=='ok'))process.exitCode=1;
}
void main();
