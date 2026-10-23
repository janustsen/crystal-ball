import {makePlan} from '../server/engine.ts';
import type {ModelProvider} from '../server/provider.ts';
import {adaptPlan} from '../src/questions.ts';
import type {Facts,ReadingContext} from '../src/types.ts';

export async function measureFirstCard(question:string,known:Facts,model:ModelProvider,context:ReadingContext={},now=()=>performance.now()){
 const start=now();
 let plan=await makePlan(question,known,model,context);
 if(plan.kind==='ok')plan={...plan,value:adaptPlan(plan.value,plan.value.provided)};
 // A token, an unvalidated draft or a failed plan cannot be shown as a question card.
 const firstCardSeconds=plan.kind==='ok'&&plan.value.cards.length>0?(now()-start)/1000:null;
 return {plan,firstCardSeconds};
}

export function firstCardGate(samples:(number|null)[],expectedSamples:number){
 const seconds=samples.filter((value):value is number=>value!==null&&Number.isFinite(value)&&value>=0).sort((a,b)=>a-b);
 const percentile=(p:number)=>seconds.length?seconds[Math.ceil(p*seconds.length)-1]:null;
 const p50Seconds=percentile(.5),p95Seconds=percentile(.95),limitSeconds=10;
 const failedSamples=expectedSamples-seconds.length;
 return {limitSeconds,expectedSamples,samples:seconds.length,failedSamples,p50Seconds,p95Seconds,
  passed:expectedSamples>0&&samples.length===expectedSamples&&failedSamples===0&&p95Seconds!==null&&p95Seconds<=limitSeconds};
}
