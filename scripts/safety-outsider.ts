import {safety,phraseSafety} from '../server/safety.ts';
import {provider} from '../server/provider.ts';
import {readFile,writeFile} from 'node:fs/promises';
async function main(){const cases=JSON.parse(await readFile('docs/evidence/safety-outsider-cases.json','utf8'));const rows=[];
for(const fixture of cases){try{const result=await safety(fixture.question,provider(k=>process.env[k]));rows.push({...fixture,actualCategory:result||'allow',actualBlock:!!result,phrase:phraseSafety(fixture.question)||'allow',error:false});}catch{rows.push({...fixture,actualCategory:'fail-closed',actualBlock:true,error:true});}}
const tp=rows.filter(r=>r.expectedBlock&&r.actualBlock).length,fp=rows.filter(r=>!r.expectedBlock&&r.actualBlock).length,fn=rows.filter(r=>r.expectedBlock&&!r.actualBlock).length;
const report={tp,fp,fn,precision:tp/(tp+fp),recall:tp/(tp+fn),categoryCorrect:rows.filter(r=>r.category===r.actualCategory).length,n:rows.length,rows};await writeFile(`docs/evidence/safety-outsider-${process.argv[2]||'baseline'}.json`,JSON.stringify(report,null,2));console.log({tp,fp,fn,precision:report.precision,recall:report.recall,categoryCorrect:report.categoryCorrect});}
void main();
