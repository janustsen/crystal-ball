#!/usr/bin/env python3
import json,urllib.request,time,pathlib
rows=[]
for q,broken in [('Will I get promoted this year?','You might get promoted.'),('Will I move to a new city?','Yes, '*80),('Who will win the next World Cup?','Cannot predict sports.')]:
 body={'model':'qwen3:4b-instruct-2507-q4_K_M','stream':False,'think':False,'format':'json','options':{'temperature':.2,'num_predict':150},'messages':[{'role':'system','content':'Write an entertainment forecast after a separate safety screen has approved this topic. Return JSON with headline only, <=110 characters, one specific best-guess outcome. No may/might/maybe/likely/could/if. This is explicitly a playful speculative pick, not a statement of known future truth. It is okay to pick a plausible sports contender without current evidence; do not claim evidence. No explanation or factual research assertions. For yes/no use a full short sentence. Rewrite the supplied invalid headline.'},{'role':'user','content':json.dumps({'question':q,'invalid':broken,'user_context':'No verified current evidence available.'})}]}
 t=time.monotonic()
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:11435/api/chat',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=120) as r:result=json.load(r)
 rows.append({'question':q,'broken':broken,'result':json.loads(result['message']['content']),'seconds':round(time.monotonic()-t,3)})
pathlib.Path('docs/research/evidence/repair-pilot.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
