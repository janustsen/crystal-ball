#!/usr/bin/env python3
"""Systematic public review metadata sample. No full review reproduction or age inference."""
import urllib.request,json,datetime,pathlib,re
rules={'price':r'price|expensive|cost|money|pay|subscription|charge|refund|billing','repetition':r'repeat|repetiti|same (thing|answer|reading|message)','trust_accuracy':r'accurate|accuracy|true|trust|scam|fake|wrong|relatab','sharing':r'shar(e|ing)|friend|social'}
result=[]
for name,id in [('costar','1264782561'),('nebula','1459969523'),('pattern','1071085727')]:
 url=f'https://itunes.apple.com/us/rss/customerreviews/page=1/id={id}/sortby=mostrecent/json'
 # Fixed HTTPS Apple origin with IDs from the literal list above; no user-controlled URL.
 # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
 with urllib.request.urlopen(url,timeout=30) as response: data=json.load(response)
 rows=[]
 for entry in data['feed'].get('entry',[]):
  if 'im:rating' not in entry:continue
  content=entry['content']['label'];tags=[tag for tag,pattern in rules.items() if re.search(pattern,content,re.I)]
  rows.append({'id':entry['id']['label'],'date':entry['updated']['label'],'rating':int(entry['im:rating']['label']),'tags':tags})
 result.append({'app':name,'source':url,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'First page most-recent US RSS reviews; case-insensitive keyword mentions, not sentiment or complaint counts; all available rating entries. No ages supplied. Raw copyrighted review bodies intentionally not retained.','rules':rules,'n':len(rows),'counts':{tag:sum(tag in r['tags'] for r in rows) for tag in rules},'rows':rows})
pathlib.Path('docs/research/evidence/review-sample.json').write_text(json.dumps(result,indent=2));print(json.dumps([{k:v for k,v in r.items() if k!='rows'} for r in result],indent=2))
