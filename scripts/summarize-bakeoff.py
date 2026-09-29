#!/usr/bin/env python3
import json,pathlib,statistics,math,random
files=list(pathlib.Path('docs/research/evidence').glob('compare-*.json'));summary=[];blind=[];mapping={}
random.Random(7).shuffle(files)
for i,p in enumerate(files):
 x=json.loads(p.read_text());rows=x['rows'];times=[r['raw']['seconds']+r.get('repair',{}).get('seconds',0) for r in rows]
 label=chr(65+i);mapping[label]=x['model']
 summary.append({'model':x['model'],'n':len(rows),'median_seconds':statistics.median(times),'p95_seconds_nearest_rank':sorted(times)[math.ceil(.95*len(times))-1],'fit':sum(r['fit'] for r in rows),'hedged':sum(r['hedged'] for r in rows),'safety_pass':sum(r['safety_pass'] for r in rows),'arithmetic_pass':sum(r['arithmetic_pass'] for r in rows),'repairs':sum('repair' in r for r in rows),'flows':[{k:v for k,v in f.items() if k not in ['calls','answers']} for f in x.get('flows',[])]})
 for r in rows:blind.append({'candidate':label,'case':r['case'],'repeat':r['repeat'],'question':r['question'],'evidence':r['evidence'],'answer':r.get('repair',r['raw'])['answer']})
random.Random(9).shuffle(blind)
pathlib.Path('docs/research/evidence/comparison-summary.json').write_text(json.dumps(summary,indent=2))
pathlib.Path('docs/research/evidence/blinded-outputs.json').write_text(json.dumps(blind,indent=2))
pathlib.Path('.local/blind-mapping.json').write_text(json.dumps(mapping,indent=2))
print(json.dumps(summary,indent=2))
