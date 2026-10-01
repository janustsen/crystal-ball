#!/usr/bin/env python3
"""Execute allowed sports synthesis with its required on-screen uncertainty context."""
import json,urllib.request,time,pathlib
rows=[]
for attempt in range(3):
 body={'model':'qwen3:4b-instruct-2507-q4_K_M','stream':False,'think':False,'format':'json','options':{'temperature':.2,'num_predict':100},'messages':[{'role':'system','content':'This is an entertainment forecast with a separate visible Speculative forecast label and explanation that no verified current evidence supports it. Sports is allowed. Return JSON headline only: one plausible team as a specific World Cup winner pick, max 110 characters, no supporting facts, no may/might/likely/could. Do not refuse a safe sports pick.'},{'role':'user','content':'Who will win the next men’s football World Cup? No current performance evidence is available.'}]}
 start=time.monotonic()
 # Fixed loopback-only Ollama endpoint; request data cannot change the URL and local HTTP is intentional.
 # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected, python.lang.security.audit.insecure-transport.urllib.insecure-request-object.insecure-request-object
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:11435/api/chat',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=60) as r:raw=json.load(r)
 headline=json.loads(raw['message']['content'])['headline']
 rows.append({'attempt':attempt,'headline':headline,'label':'Speculative forecast · not a guarantee','why':'No verified current performance evidence supports this pick. This is a playful guess, not a researched sporting conclusion.','source_count':0,'seconds':round(time.monotonic()-start,3)})
pathlib.Path('docs/research/evidence/sports-presentation-pilot.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
