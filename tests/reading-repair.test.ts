import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {predict} from '../server/engine.ts';
import {provider} from '../server/provider.ts';

// Actual Qwen drafts and failed repairs from the four main-branch regressions.
const cases=JSON.parse(readFileSync(new URL('./fixtures/reading-repair.json',import.meta.url),'utf8'));
for(const row of cases)for(const hosted of [false,true]){
 test(`${hosted?'hosted':'local'} repair identifies the rejected fields: ${row.question}`,async t=>{
  const env:Record<string,string>=hosted?{MODEL_PROVIDER:'hosted',HOSTED_MODEL_URL:'https://example.invalid/v1',HOSTED_MODEL_NAME:'replay',HOSTED_MODEL_KEY:'test-only'}:{};
  for(const repaired of [false,true]){
   let attempts=0,feedback='';
   t.mock.method(globalThis,'fetch',async(_url,init)=>{
    const body=JSON.parse(String(init?.body)),schema=hosted?body.response_format.json_schema.schema:body.format;
    let content:unknown={category:'allow'};
    if(schema.properties.prediction){
     if(attempts++)feedback=body.messages.at(-1).content;
     content=attempts===1?row.draft:repaired?row.fixedRepair:row.failedRepair;
    }
    const text=JSON.stringify(content);
    return Response.json(hosted?{choices:[{message:{content:text}}]}:{message:{content:text}});
   });
   const result=await predict(row.question,row.facts,false,provider(key=>env[key]),row.context);
   assert.equal(result.kind,repaired?'ok':'error',JSON.stringify(result));
   assert.equal(attempts,2,'Only the original request and one repair are allowed.');
   for(const expected of row.feedbackIncludes)assert.ok(feedback.includes(expected),`${expected}: ${feedback}`);
   if(result.kind==='ok')assert.equal(result.value.why,row.fixedRepair.insight);
   t.mock.restoreAll();
  }
 });
}
