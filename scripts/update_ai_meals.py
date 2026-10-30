"""Update only the existing meal service; preserve the Afita chat and key."""
import argparse,json,pathlib,re,subprocess,time,urllib.request

def main():
 p=argparse.ArgumentParser();p.add_argument('--commit',required=True);a=p.parse_args()
 if not re.fullmatch('[a-f0-9]{40}',a.commit):raise SystemExit('Exact commit required')
 mount_info=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .Mounts}}','afita-meals'],text=True))
 mounts=[m for m in mount_info if m.get('Destination')=='/app' and m.get('Type')=='bind']
 if len(mounts)!=1:raise SystemExit('Cannot identify existing source mount; nothing changed')
 root=pathlib.Path(mounts[0]['Source']).resolve()
 if not root.is_relative_to('/opt/alenafit-assistant/ai-meals'):raise SystemExit('Unexpected source path; nothing changed')
 target=root/'handler.js';old=target.read_bytes()
 url=f'https://raw.githubusercontent.com/alexcomun85-star/Alena/{a.commit}/server/meal-plan/handler.js'
 with urllib.request.urlopen(url,timeout=30) as r:new=r.read(100000)
 if b'minItems:7,maxItems:7' not in new or b'minItems:4,maxItems:4' not in new:raise SystemExit('Expected schema fix missing')
 if new==old:print('Обновление уже установлено');return
 backup=root/('handler.before-shape-fix-'+str(int(time.time()))+'.js');backup.write_bytes(old)
 try:
  target.write_bytes(new)
  subprocess.run(['docker','exec','afita-meals','node','--check','handler.js'],check=True)
  subprocess.run(['docker','restart','afita-meals'],check=True,stdout=subprocess.DEVNULL)
  for attempt in range(30):
   try:
    with urllib.request.urlopen('http://127.0.0.1:18081/api/meal-plan/status',timeout=2) as r:ready=json.load(r).get('ready')
    if ready:break
   except OSError:pass
   time.sleep(.5)
  else:raise RuntimeError('Service not ready')
 except Exception:
  target.write_bytes(old);subprocess.run(['docker','restart','afita-meals'],stdout=subprocess.DEVNULL);raise
 print('ГОТОВО: строгая схема 7 дней × 4 блюда установлена. Можно проверять генерацию.')
if __name__=='__main__':main()
