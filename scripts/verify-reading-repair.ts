import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {predict} from '../server/engine.ts';
import {provider,type ModelProvider,type Validator} from '../server/provider.ts';

// This gate always uses local Ollama; never consumes hosted inference or substitutes replies.
const cases=JSON.parse(readFileSync(new URL('../tests/fixtures/reading-repair.json',import.meta.url),'utf8'));
const source=provider(key=>key==='MODEL_PROVIDER'?'ollama':process.env[key]);
async function main(){
 let failures=0;
 for(const row of cases){
  const verdicts:unknown[]=[];
  const model:ModelProvider={json(system,input,schema,valid,signal){
   const observe:Validator=async candidate=>{const verdict=await valid(candidate);if((schema.properties as Record<string,unknown>).prediction)verdicts.push({candidate,verdict});return verdict};
   return source.json(system,input,schema,observe,signal);
  }};
  const started=performance.now(),result=await predict(row.question,row.facts,false,model,row.context);
  console.log(JSON.stringify({question:row.question,seconds:(performance.now()-started)/1000,verdicts,result}));
  try{assert.equal(result.kind,'ok',row.question);assert.ok(verdicts.length>=1&&verdicts.length<=2)}catch{failures++}
 }
 assert.equal(failures,0,`${failures} captured contexts failed with real local Qwen.`);
}
void main();
