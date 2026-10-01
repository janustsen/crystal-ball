#!/usr/bin/env python3
import urllib.request,urllib.parse,xml.etree.ElementTree as E,json,datetime,time,pathlib
queries=['inflation outlook','World Cup football','San Francisco events October','language learning practice','electric vehicle adoption']
rows=[]
for query in queries:
 for provider in ['google_news','wikipedia']:
  url=('https://news.google.com/rss/search?'+urllib.parse.urlencode({'q':query,'hl':'en-US','gl':'US','ceid':'US:en'})) if provider=='google_news' else ('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','list':'search','srsearch':query,'format':'json'}))
  start=time.monotonic();row={'provider':provider,'query':query,'url':url,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'CrystalBallPrototype/0.1 (local research)'}),timeout=10) as r:body=r.read().decode();row['status']=r.status
   if provider=='google_news':
    items=[{'title':x.findtext('title'),'source':x.findtext('source'),'date':x.findtext('pubDate'),'url':x.findtext('link')} for x in E.fromstring(body).findall('./channel/item')[:3]]
   else:items=[{'title':x['title'],'snippet':x['snippet'],'url':'https://en.wikipedia.org/?curid='+str(x['pageid']),'date':x.get('timestamp')} for x in json.loads(body)['query']['search'][:3]]
   row['items']=items;row['seconds']=round(time.monotonic()-start,3)
  except Exception as e:row['error']=str(e)
  rows.append(row)
pathlib.Path('docs/research/evidence/search-expanded.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
