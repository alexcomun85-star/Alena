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
 names=['handler.js','contract.js','balance.js','server.mjs'];old={};new={}
 for name in names:
  old[name]=(root/name).read_bytes() if (root/name).exists() else None
  url=f'https://raw.githubusercontent.com/alexcomun85-star/Alena/{a.commit}/server/meal-plan/{name}'
  with urllib.request.urlopen(url,timeout=30) as r:new[name]=r.read(100000)
 if b'minItems:7,maxItems:7' not in new['handler.js'] or b"code:'interrupted'" not in new['handler.js'] or b'warnings.push' not in new['contract.js']:raise SystemExit('Expected fixes missing')
 if new==old:print('Обновление уже установлено');return
 stamp=str(int(time.time()))
 for name in names:
  if old[name] is not None:(root/(name+'.before-update-'+stamp)).write_bytes(old[name])
 try:
  for name in names:(root/name).write_bytes(new[name])
  for name in names:subprocess.run(['docker','exec','afita-meals','node','--check',name],check=True)
  subprocess.run(['docker','restart','afita-meals'],check=True,stdout=subprocess.DEVNULL)
  for attempt in range(30):
   try:
    with urllib.request.urlopen('http://127.0.0.1:18081/api/meal-plan/status',timeout=2) as r:ready=json.load(r).get('ready')
    if ready:break
   except OSError:pass
   time.sleep(.5)
  else:raise RuntimeError('Service not ready')
 except Exception:
  
  for name in names:
   if old[name] is None:(root/name).unlink(missing_ok=True)
   else:(root/name).write_bytes(old[name])
  subprocess.run(['docker','restart','afita-meals'],stdout=subprocess.DEVNULL);raise
 print('ГОТОВО: исправлен учёт лимитов. Неудачные попытки возвращены; общий бюджет учитывает реальные запросы к ИИ.')
if __name__=='__main__':main()
