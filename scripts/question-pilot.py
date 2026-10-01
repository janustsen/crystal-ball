#!/usr/bin/env python3
"""Constrained eligibility and real 4B ranking research; not the app implementation."""
import json,pathlib,urllib.request,time
registries={
'growth':[('current_users','How many people use it today?',['0','1–20','21–100']),('weekly_growth','How many new users join each week?',['0–2','3–10','More than 10']),('retention','How often do people return?',['Rarely','Weekly','Daily'])],
'relocation':[('location','Where do you live now?',['Large city','Small town','Countryside']),('lease','When does your current lease end?',['Within 3 months','Within a year','No lease']),('work','Can your work move with you?',['Remote','Need a new job','Not working'])],
'sports':[('competition','Which tournament do you mean?',["Men’s World Cup","Women’s World Cup","Club World Cup"]),('edition','Which edition are we forecasting?',['Next edition','Following edition','A later edition']),('scope','Which field of teams should I consider?',['All entrants','Current favorites','Underdogs'])],
'learning':[('level','What is your Spanish level now?',['New beginner','Know the basics','Intermediate']),('practice','How often do you practice?',['Daily','A few times weekly','Rarely']),('support','How do you learn?',['Tutor','App','Friends'])]}
common=[('time_budget','How much time can you give this weekly?',['Under 2 hours','2–5 hours','Over 5 hours']),('constraint','What is the biggest obstacle right now?',['Time','Budget','Access']),('deadline','How firm is your timeframe?',['Flexible','Important','Fixed']),('resources','How prepared are you right now?',['Just starting','Some preparation','Ready']),('change','What changed since your last forecast?',['More time','New information','New plan']),('priority','What matters most for this forecast?',['Timing','Outcome','A milestone']),('evidence','What recent signal have you noticed?',['Progress','No change','A setback']),('commitment','How settled is your current plan?',['Exploring','Mostly decided','Committed']),('confidence','How clear is the current information?',['Clear','Mixed','Very limited'])]
questions={'growth':'Will my side project reach 100 users?','relocation':'Will I move to another city next year?','sports':'Who will win the next World Cup?','learning':'Will I learn conversational Spanish?'}
# Sports uses event context, not the user's budget/effort.
sports_extra=[('venue','Which setting matters?',['Home region','Away region','Any venue']),('form','How should recent form weigh in?',['Strongly','Moderately','Lightly']),('history','How should historical results weigh in?',['Strongly','Moderately','Lightly']),('priority','What matters most?',['Champion','Finalist','Surprise team']),('evidence','What current information is available?',['Recent results','Only older results','None']),('format','Which competition format?',['Known format','Changing format','Not sure']),('change','What changed since your last forecast?',['New results','New teams','No change']),('upset','How should I frame the pick?',['Best-supported pick','An underdog pick','A bold pick'])]
def select(registry,known,answers,budget,ranks,returning):
 if len(answers)>=budget:return None
 eligible={k:(q,opts+['Other']) for k,q,opts in registry if k not in known and k not in answers and (k!='change' or returning)}
 if not eligible:return None
 # An observed low time budget changes the next card regardless of a stale rank.
 adaptive=['constraint'] if answers.get('time_budget')=='Under 2 hours' else []
 key=next((k for k in adaptive+ranks if k in eligible),next(iter(eligible)))
 return {'id':key,'question':eligible[key][0],'options':eligible[key][1]}
rows=[];rank_evidence=[]
for domain,base in registries.items():
 registry=base+(sports_extra if domain=='sports' else common)
 for budget in [3,10]:
  body={'model':'qwen3:4b-instruct-2507-q4_K_M','stream':False,'think':False,'format':'json','options':{'temperature':.2,'num_predict':180},'messages':[{'role':'system','content':'Rank the supplied fact IDs by relevance to the question. Return JSON with ranked_ids array. Select facts about present context, never ask the user to predict their future. Use only provided IDs. Session change is not available to first-time users.'},{'role':'user','content':json.dumps({'question':questions[domain],'budget':budget,'facts':[{'id':k,'question':q} for k,q,o in registry if k!='change']})}]}
  start=time.monotonic()
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:11435/api/chat',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=60) as r:raw=json.load(r)
  ranks=json.loads(raw['message']['content']).get('ranked_ids',[])
  rank_evidence.append({'domain':domain,'budget':budget,'question':questions[domain],'ranks':ranks,'seconds':round(time.monotonic()-start,3)})
  for returning in [False,True]:
   known={base[0][0]:base[0][2][0]} if returning and budget==3 else {};answers={};cards=[]
   while (card:=select(registry,known,answers,budget,ranks,returning)):
    cards.append(card);answers[card['id']]=card['options'][0]
   assert len(cards)==budget
   assert len(set(x['id'] for x in cards))==budget
   assert not (set(known)&set(answers))
   assert returning or 'change' not in answers
   assert all('Other' in x['options'] for x in cards)
   rows.append({'domain':domain,'budget':budget,'returning':returning,'known':known,'cards':cards,'pass':True})
# Reproduce the fixed lifecycle bug and an actual answer-dependent branch.
r=registries['growth']+common
assert select(r,{}, {'time_budget':'Under 2 hours'},10,['weekly_growth'],False)['id']=='constraint'
assert select(r,{}, {'time_budget':'Over 5 hours'},10,['weekly_growth'],False)['id']=='weekly_growth'
pathlib.Path('docs/research/evidence/question-pilot-expanded.json').write_text(json.dumps({'ranks':rank_evidence,'flows':rows,'adaptive_branch_pass':True},indent=2));print('Four domains; first/repeat visits; real 4B ranks; 3/10 bounds; Other; known exclusion; adaptive branch PASS')
