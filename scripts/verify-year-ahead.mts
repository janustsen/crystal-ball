// Live Year ahead generation against local Ollama: OLLAMA_URL=http://127.0.0.1:<port> npx tsx scripts/verify-year-ahead.mts
// Prints each run's twelve forecasts and timing; exits non-zero if any run fails closed. Structural pass only, not quality.
import {handler} from '../server/handler.ts';
const serve=handler(key=>process.env[key]);
const runs=[
 {viewerBirthday:'1990-03-25',facts:{current_focus:'Learning to paint'}},
 {viewerBirthday:'2010-07-02',facts:{current_focus:'Making the school band'}},
 {ageConfirmed:true,facts:{}},
];
let failed=0;
for(const run of runs){
 const started=Date.now();
 const response=await serve(new Request('http://localhost/',{method:'POST',body:JSON.stringify({action:'year',question:'Your year ahead',localDate:new Date().toISOString().slice(0,10),...run})}));
 const result=await response.json();
 console.log(JSON.stringify({input:run,ms:Date.now()-started,status:response.status,result},null,1));
 if(result.kind!=='ok')failed++;
}
process.exit(failed?1:0);
