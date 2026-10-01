#!/usr/bin/env python3
import urllib.request,xml.etree.ElementTree as ET,time,json,pathlib
urls={'bing':'https://www.bing.com/search?format=rss&q=US+inflation+outlook','google_news':'https://news.google.com/rss/search?q=US+inflation+outlook&hl=en-US&gl=US&ceid=US:en','wikipedia':'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=inflation&format=json','ddg':'https://html.duckduckgo.com/html/?q=US+inflation+outlook'}
rows=[]
for name,url in urls.items():
 start=time.monotonic()
 try:
  # URL comes only from the literal HTTPS endpoint dictionary above.
  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'CrystalBallPrototype/0.1 (local research)'}),timeout=15) as response:body=response.read().decode();status=response.status
  row=dict(name=name,status=status,seconds=round(time.monotonic()-start,2),bytes=len(body),captcha='anomaly' in body)
  if name in ['bing','google_news']:
   root=ET.fromstring(body);row['titles']=[x.findtext('title') for x in root.findall('./channel/item')[:3]]
  rows.append(row)
 except Exception as e:rows.append(dict(name=name,error=str(e)))
pathlib.Path('docs/research/evidence/search-probe-repeat.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
