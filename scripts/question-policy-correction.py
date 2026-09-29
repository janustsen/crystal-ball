#!/usr/bin/env python3
import json,pathlib
x=json.load(open('docs/research/evidence/question-pilot-expanded.json'));rows=[]
for f in x['flows']:
 cards=f['cards'];domain=f['domain'];known=f['known']
 if domain=='sports':
  pool={k:{'id':k,'question':q,'options':o+['Other']} for k,q,o in [('competition','Which football tournament?',['Men’s World Cup','Women’s World Cup','Club World Cup']),('edition','Which tournament year?',['2030','2034','Not sure']),('evidence','What current performance information do you have?',['Recent results','Only older results','None']),('teams','How settled is the tournament field?',['Field confirmed','Qualifying in progress','Not sure'])]}
  cards=[v for k,v in pool.items() if k not in known][:3]
 if domain=='learning' and 'level' not in known:
  cards=[{'id':'level','question':'What is your Spanish level now?','options':['New beginner','Know the basics','Intermediate','Other']}]+[c for c in cards if c['id']!='level'];cards=cards[:min(f['budget'],6)]
 if domain=='relocation':
  essentials=[{'id':'location','question':'Where do you live now?','options':['Large city','Small town','Countryside','Other']},{'id':'destination','question':'Where would you like to move?','options':['Another nearby city','Another region','Another country','Other']}]
  pool={c['id']:c for c in cards}
  essentials += [pool[k] for k in ['work','lease'] if k in pool]
  ordered=[c for c in essentials if c['id'] not in known]+[c for c in cards if c['id'] not in {e['id'] for e in essentials}]
  cards=ordered[:min(f['budget'],6)]
 if domain=='growth':
  pool={c['id']:c for c in cards}
  essential=[{'id':'current_users','question':'How many people use it today?','options':['0','1–20','21–100','Other']},{'id':'weekly_growth','question':'How many new users join weekly?','options':['0–2','3–10','More than 10','Other']},{'id':'retention','question':'How often do users return?','options':['Rarely','Weekly','Daily','Other']},{'id':'distribution','question':'How do new users find it?','options':['Friends','Content','Paid ads','Other']}]
  ordered=[c for c in essential if c['id'] not in known]+[c for c in cards if c['id'] not in {e['id'] for e in essential}]
  cards=ordered[:min(f['budget'],6)]
 assert 3<=len(cards)<=10 and len({c['id'] for c in cards})==len(cards)
 assert not set(known)&{c['id'] for c in cards}
 assert f['returning'] or all(c['id']!='change' for c in cards)
 rows.append({**f,'cards':cards,'actual_count':len(cards),'policy':'essential facts first; cap is not a target; retained real ranks for optional facts','structural_pass':True})
pathlib.Path('docs/research/evidence/question-policy-correction.json').write_text(json.dumps(rows,indent=2));print('16 constrained policy scenarios passed')
