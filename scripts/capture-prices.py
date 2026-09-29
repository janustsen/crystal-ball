#!/usr/bin/env python3
import subprocess,os,pathlib,re,datetime
E={**os.environ,'CHROME_DEVTOOLS_AXI_SESSION':'crystal-ball'}
def run(*args):return subprocess.run(['chrome-devtools-axi',*args],env=E,capture_output=True,text=True,check=True).stdout
for name,url in [('pattern','https://apps.apple.com/us/app/the-pattern/id1071085727'),('nebula','https://apps.apple.com/us/app/nebula-spiritual-guidance/id1459969523')]:
 run('open',url,'--full');snapshot=run('snapshot','--full')
 ref=re.search(r'uid=([^ ]+) DisclosureTriangle "Yes"',snapshot)
 if not ref:raise RuntimeError('No observed IAP disclosure on '+name)
 run('click','@'+ref[1]);snapshot=run('snapshot','--full')
 start=snapshot.index('StaticText "In-App Purchases"');end=snapshot.index('StaticText "Copyright"',start)
 pathlib.Path('docs/research/evidence/'+name+'-iap.txt').write_text('Captured '+datetime.datetime.now(datetime.timezone.utc).isoformat()+'\n'+url+'\n'+snapshot[start:end])
 run('screenshot',str(pathlib.Path('docs/research/evidence/'+name+'-expanded.jpeg').resolve()),'--full-page','--format','jpeg')
 print(name+' captured',flush=True)
snapshot=pathlib.Path('.local/costar-expanded-iap.txt').read_text();start=snapshot.index('StaticText "In-App Purchases"');end=snapshot.index('StaticText "Copyright"',start)
pathlib.Path('docs/research/evidence/costar-iap.txt').write_text('Captured '+datetime.datetime.now(datetime.timezone.utc).isoformat()+'\nhttps://apps.apple.com/us/app/co-star-personalized-astrology/id1264782561\n'+snapshot[start:end])
