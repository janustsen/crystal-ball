// Independent, read-only subscription CLI graders. Never pass prior scores to a grader.
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import sharp from 'sharp';
const round=process.argv[2];if(!/^docs\/ux-loop\/round-\d+$/.test(round||''))throw new Error('Pass docs/ux-loop/round-NN');
await mkdir(`${round}/sheets`,{recursive:true});
const names=(await readdir(`${round}/screens`)).filter(n=>n.endsWith('.png')&&!n.startsWith('fail-')).sort();
const images=[];
for(let offset=0;offset<names.length;offset+=4){
 const tiles=[];
 for(const [index,name] of names.slice(offset,offset+4).entries()){
  const label=Buffer.from(`<svg width="390" height="32"><rect width="390" height="32" fill="#fff"/><text x="8" y="22" font-size="16" font-family="sans-serif" fill="#000">${name}</text></svg>`);
  const screenshot=await sharp(`${round}/screens/${name}`).resize(390,844,{fit:'contain',background:'#120e0b'}).toBuffer();
  tiles.push({input:label,left:index%2*390,top:Math.floor(index/2)*876},{input:screenshot,left:index%2*390,top:Math.floor(index/2)*876+32});
 }
 const path=resolve(`${round}/sheets/${String(offset/4+1).padStart(2,'0')}.jpg`);
 await sharp({create:{width:780,height:1752,channels:3,background:'#fff'}}).composite(tiles).jpeg({quality:90}).toFile(path);images.push(path);
}
const rubric=await readFile(`${round}/rubric.md`,'utf8'),evidence=await readFile(`${round}/runtime.md`,'utf8');
const dimension={type:['number','null']};
const dims={type:'object',additionalProperties:false,properties:Object.fromEntries(['hierarchy','typography','surfaces','clarity','feedback','accessibility'].map(k=>[k,dimension])),required:['hierarchy','typography','surfaces','clarity','feedback','accessibility']};
const item={type:'object',additionalProperties:false,properties:{name:{type:'string'},dimensions:dims,evidence:{type:'string'},findings:{type:'array',items:{type:'string'}}},required:['name','dimensions','evidence','findings']};
const schema={type:'object',additionalProperties:false,properties:{screens:{type:'array',items:item},components:{type:'array',items:item},limitations:{type:'array',items:{type:'string'}},topFixes:{type:'array',items:{type:'string'}}},required:['screens','components','limitations','topFixes']};
await writeFile(`${round}/grade-schema.json`,JSON.stringify(schema,null,2));
const prompt=`You are an independent blind UX evaluator. Read-only evaluation; do not implement, delegate, supervise, browse other task state, or read other graders/previous rounds. Evaluate the attached labeled screenshots of Crystal Ball, a speculative entertainment app. The material direction is borderless dark mist, with a gold illustrated orb as the hero. Sample layout predictions are fixtures and cannot establish model quality. Treat runtime limitations honestly. Never infer functionality from a screenshot. Do not award a desired score to satisfy a target.\n\nFROZEN RUBRIC:\n${rubric}\n\nRUNTIME EVIDENCE:\n${evidence}\n\nGrade EVERY settled screen and key state represented in the sheets (group its corresponding transition with it, assess visible transition continuity). Include ALL represented core states and empty, error, loading, expanded, other-input and populated variants, including main’s birthday/focus/age-confirmation onboarding, birthday editing, optional birth details and named-person input when pictured. Grade these components individually too: hero orb, tab bar, wordmark/balance header, primary button, secondary action, answer choice, question input, large-text input, settings switch, omen content, sky star/selected question, circle surface, history row, plan option, share preview, notice/recovery, typography, atmospheric background; and, when present, birthday input, age confirmation, focus selection, birth-profile surface, birth-details form, named-person control, evidence disclosure and export status. If evidence is missing, record it and provisional scores; do not invent proof. For each screen and component give six 0–10 dimension scores, evidence and concise concrete findings. Use null only for truly inapplicable dimensions, not missing evidence. Return the required JSON. Keep each evidence field to one sentence and findings to ONE concise, actionable sentence per item. Do not classify intentionally labeled synthetic fixture wording as a production-copy bug; runtime evidence states the boundary. You may inspect ONLY the round's screenshots, controls.json, layout.json and runtime.md if more detail is needed. Do not inspect research.md (contains prior ratings), source, or other files.\n`;
await writeFile(`${round}/grader-prompt.txt`,prompt);
await Promise.all(['a','b'].map(async grader=>{
 const output=resolve(`${round}/grader-${grader}.json`),log=await import('node:fs').then(fs=>fs.createWriteStream(`${round}/grader-${grader}.log`));
 await new Promise((done,fail)=>{
  const args=['exec','--ephemeral','-s','read-only','-m','gpt-6-astra','-c','model_reasoning_effort="medium"','--output-schema',resolve(`${round}/grade-schema.json`),'-o',output];
  for(const path of images)args.push('-i',path);
  args.push('-');
  const child=spawn('codex',args,{stdio:['pipe','pipe','pipe']});child.stdout.pipe(log);child.stderr.pipe(log);child.stdin.end(prompt);
  child.on('error',fail);child.on('close',code=>{log.end();code===0?done():fail(new Error(`grader ${grader} exit ${code}`))});
 });
 console.log(`Grader ${grader} finished`);
}));
const rows=[];
for(const grader of ['a','b']){
 const result=JSON.parse(await readFile(`${round}/grader-${grader}.json`,'utf8'));
 for(const category of ['screens','components'])for(const item of result[category]){
  const mean=keys=>{const values=keys.map(k=>item.dimensions[k]).filter(v=>v!==null);return values.reduce((a,b)=>a+b,0)/values.length};
  rows.push({grader,category,name:item.name,A:mean(['hierarchy','typography','surfaces']),F:mean(['clarity','feedback','accessibility'])});
 }
}
const scores=rows.flatMap(r=>[r.A,r.F]).sort((a,b)=>a-b),summary={minimum:scores[0],median:scores[Math.floor(scores.length/2)],allAtLeast9:scores.every(n=>n>=9),rows};
await writeFile(`${round}/scores.json`,JSON.stringify(summary,null,2));
await writeFile(`${round}/scores.md`,['| Grader | Kind | Screen / component | A | F |','|---|---|---|---:|---:|',...rows.map(r=>`| ${r.grader} | ${r.category} | ${r.name} | ${r.A.toFixed(2)} | ${r.F.toFixed(2)} |`)].join('\n')+'\n');
console.log(JSON.stringify({minimum:summary.minimum,median:summary.median,allAtLeast9:summary.allAtLeast9}));
