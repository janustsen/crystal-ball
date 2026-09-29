#!/usr/bin/env python3
import subprocess,os,pathlib,datetime
pages={'costar':'https://apps.apple.com/us/app/co-star-personalized-astrology/id1264782561','pattern':'https://apps.apple.com/us/app/the-pattern/id1071085727','nebula':'https://apps.apple.com/us/app/nebula-spiritual-guidance/id1459969523','tarot-ai':'https://apps.apple.com/us/app/tarot-card-readings/id1611588287','oracle-guru':'https://apps.apple.com/us/app/fortune-teller-oracle-guru/id1667009693'}
env={**os.environ,'CHROME_DEVTOOLS_AXI_SESSION':'crystal-ball'}
for name,url in pages.items():
 p=subprocess.run(['chrome-devtools-axi','open',url,'--full'],env=env,capture_output=True,text=True)
 pathlib.Path('docs/research/evidence/'+name+'-listing.txt').write_text('Captured '+datetime.datetime.now(datetime.timezone.utc).isoformat()+'\n'+'\n'.join(line for line in p.stdout.splitlines() if any(k in line for k in ['  url:', 'heading ', 'RATINGS', 'Stars'])))
 subprocess.run(['chrome-devtools-axi','screenshot','docs/research/evidence/'+name+'.jpg','--full-page','--format','jpeg'],env=env,check=True)
