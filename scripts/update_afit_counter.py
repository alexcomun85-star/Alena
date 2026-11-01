"""Update only the persisted guest chat counter. Keep UI, model and password intact."""
import argparse,ast,json,pathlib,re,subprocess,time,urllib.request

def main():
    p=argparse.ArgumentParser();p.add_argument('--commit',required=True);a=p.parse_args()
    if not re.fullmatch('[a-f0-9]{40}',a.commit):raise SystemExit('Exact commit required')
    url=f'https://raw.githubusercontent.com/alexcomun85-star/Alena/{a.commit}/scripts/afit_access_gate.py'
    with urllib.request.urlopen(url,timeout=30) as r:gate=r.read(100000).decode()
    if "'revision': 'guest-counter-v2'" not in gate:raise SystemExit('Expected counter revision missing')
    backend=pathlib.Path('/opt/alenafit-assistant/server.py');old=backend.read_text()
    new,n=re.subn(r'^# AFIT_ACCESS_GATE_V1.*?^# AFIT_ACCESS_GATE_END\n?',lambda m:gate+'\n',old,count=1,flags=re.M|re.S)
    if n!=1:raise SystemExit('Existing access gate missing; nothing changed')
    ast.parse(new)
    backend.with_name(backend.name+'.before-counter-'+str(int(time.time()))).write_text(old)
    try:
        backend.write_text(new)
        subprocess.run(['docker','restart','alenafit-assistant-test'],check=True,stdout=subprocess.DEVNULL)
        for attempt in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18080/session',timeout=2) as r:status=json.load(r)
                if status.get('revision')=='guest-counter-v2' and status.get('limit')==5:break
            except OSError:pass
            time.sleep(.5)
        else:raise RuntimeError('Counter revision check failed')
    except Exception:
        backend.write_text(old)
        subprocess.run(['docker','restart','alenafit-assistant-test'],stdout=subprocess.DEVNULL);raise
    print('ГОТОВО: закрытие Афиты и новая сессия не обнуляют суточный счётчик. Пароль сохранён.')
if __name__=='__main__':main()
