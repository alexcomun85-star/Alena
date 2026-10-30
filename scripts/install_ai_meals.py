"""Run as root on Afita's existing server; never copies or prints the API key."""
import argparse, json, pathlib, re, shutil, subprocess, time, urllib.request

FILES = ['package.json', 'server.mjs', 'handler.js', 'balance.js', 'contract.js', 'foods.js', 'schema.sql']
LOCATION = '''
    # AFITA_AI_MEALS_V1
    location ^~ /api/meal-plan {
        proxy_pass http://127.0.0.1:18081;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_read_timeout 200s;
        proxy_send_timeout 200s;
        client_max_body_size 35k;
    }
'''
def patch_nginx(text):
    # Ignore comments and quoted strings when locating balanced server blocks.
    clean=re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|#[^\n]*',lambda m:' '*len(m[0]),text)
    blocks=[]
    for match in re.finditer(r'\bserver\s*\{',clean):
        depth=1; end=match.end()
        while depth and end<len(clean):
            depth += (clean[end]=='{')-(clean[end]=='}'); end+=1
        if depth: raise RuntimeError('Unbalanced nginx server block')
        body=clean[match.end():end-1]
        if re.search(r'\bserver_name\s+[^;]*\bassistant\.alenafit\.com\b',body) and re.search(r'\blisten\s+[^;]*\b443\b',body):blocks.append((match.end(),end-1))
    if len(blocks)!=1: raise RuntimeError('Expected exactly one HTTPS server for assistant.alenafit.com')
    start,end=blocks[0]
    if 'AFITA_AI_MEALS_V1' in text[start:end]: return text
    if re.search(r'location[^\n{]*meal-plan',text[start:end]):raise RuntimeError('Existing meal-plan route: left untouched')
    return text[:start]+LOCATION+text[start:]

def run(*args):return subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
def main():
    p=argparse.ArgumentParser();p.add_argument('--commit',required=True);args=p.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}',args.commit):raise SystemExit('Exact commit required')
    if subprocess.check_output(['id','-u'],text=True).strip()!='0':raise SystemExit('Run with sudo')
    key=pathlib.Path('/opt/alenafit-assistant/openai_key')
    if not key.is_file() or not key.stat().st_size:raise SystemExit('Existing Afita key not found; nothing changed')
    configs=[]
    for path in pathlib.Path('/etc/nginx/sites-enabled').iterdir():
        target=path.resolve()
        if target.is_file():
            text=target.read_text()
            if re.search(r'\bserver_name\s+[^;]*\bassistant\.alenafit\.com\b',text):
                try:patched=patch_nginx(text)
                except RuntimeError:continue
                configs.append((target,text,patched))
    if len(configs)!=1:raise SystemExit('Cannot safely identify nginx HTTPS config; nothing changed')
    config,original,patched=configs[0]
    name='afita-meals'
    existing=subprocess.run(['docker','container','inspect',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if existing.returncode==0:raise SystemExit('afita-meals already installed; left untouched')
    root=pathlib.Path('/opt/alenafit-assistant/ai-meals')/args.commit
    root.mkdir(parents=True,exist_ok=True)
    for filename in FILES:
        url=f'https://raw.githubusercontent.com/alexcomun85-star/Alena/{args.commit}/server/meal-plan/{filename}'
        with urllib.request.urlopen(url,timeout=30) as response:data=response.read(1000000)
        if not data:raise RuntimeError('Empty source file')
        (root/filename).write_bytes(data)
    state=pathlib.Path('/opt/alenafit-assistant/ai-meal-state');state.mkdir(mode=0o700,exist_ok=True)
    run('docker','pull','node:24-bookworm-slim')
    run('docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','-v',str(root)+':/app:ro','-w','/app','node:24-bookworm-slim','node','--check','server.mjs')
    backup=config.with_name(config.name+'.before-ai-meals-'+str(int(time.time())))
    # Backup is outside sites-enabled (resolved source config).
    if backup.parent==pathlib.Path('/etc/nginx/sites-enabled'):raise RuntimeError('Move nginx source to sites-available before installation')
    shutil.copy2(config,backup)
    started=False
    try:
        run('docker','run','-d','--name',name,'--restart','unless-stopped','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','0.75','--pids-limit','100','--log-opt','max-size=5m','--log-opt','max-file=2','-p','127.0.0.1:18081:8080','-v',str(root)+':/app:ro','-v',str(key)+':/run/secrets/openai_key:ro','-v',str(state)+':/state','-w','/app','node:24-bookworm-slim','node','server.mjs');started=True
        for attempt in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18081/api/meal-plan/status',timeout=2) as r:ready=json.load(r).get('ready')
                if ready:break
            except OSError:pass
            time.sleep(.5)
        else:raise RuntimeError('Meal service did not become ready')
        config.write_text(patched);run('nginx','-t');run('systemctl','reload','nginx')
        request=urllib.request.Request('https://assistant.alenafit.com/api/meal-plan/status',headers={'Origin':'https://alenafit.com'})
        with urllib.request.urlopen(request,timeout=15) as r:
            if json.load(r).get('ready') is not True or r.headers.get('Access-Control-Allow-Origin')!='https://alenafit.com':raise RuntimeError('Public route check failed')
        print('ГОТОВО: меню подключено к существующему ИИ Афиты. Чат сохранён. Платный запрос в этой проверке не выполнялся.')
    except Exception:
        config.write_text(original)
        subprocess.run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(['systemctl','reload','nginx'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if started:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        raise
if __name__=='__main__':main()
