"""Apply only guest limits and composer layout; keep existing password and chat settings."""
import argparse,ast,json,pathlib,re,subprocess,time,urllib.request

def patch(page,backend,gate,ui,css):
    assert '# AFIT_ACCESS_GATE_V1' in backend, 'Existing password gate missing'
    assert '// AFIT_MEMBER_UI_V1' in page, 'Existing member UI missing'
    backend,n=re.subn(r'^# AFIT_ACCESS_GATE_V1.*?^# AFIT_ACCESS_GATE_END\n?',lambda m:gate+'\n',backend,count=1,flags=re.M|re.S)
    assert n==1
    ast.parse(backend)
    page,n=re.subn(r'// AFIT_MEMBER_UI_V1\n.*?(?=</script>)',lambda m:ui+'\n',page,count=1,flags=re.S)
    assert n==1
    page=re.sub(r'<style id="afit-composer-fit-v2">.*?</style>\n?','',page,flags=re.S)
    # Append a narrow override after all existing theme rules; preserve colours and typography.
    override='<style id="afit-composer-fit-v2">#form{align-items:center}#question{box-sizing:border-box;min-width:0;height:80px;min-height:76px;max-height:160px;line-height:24px;padding:12px;overflow-y:auto}#send{align-self:center;margin-bottom:0}</style>'
    anchor='</body>' if '</body>' in page else '</html>'
    assert anchor in page
    page=page.replace(anchor,override+'\n'+anchor,1)
    return page,backend

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--commit',required=True);a=parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}',a.commit):raise SystemExit('Exact commit required')
    files={}
    for name in ['afit_access_gate.py','afit_member_ui.js','afit_member_ui.css','update_ai_meals.py']:
        with urllib.request.urlopen(f'https://raw.githubusercontent.com/alexcomun85-star/Alena/{a.commit}/scripts/{name}',timeout=30) as r:files[name]=r.read(100000).decode()
    page=pathlib.Path('/var/www/alenafit-assistant/index.html');backend=pathlib.Path('/opt/alenafit-assistant/server.py')
    oldpage,oldserver=page.read_text(),backend.read_text()
    newpage,newserver=patch(oldpage,oldserver,files['afit_access_gate.py'],files['afit_member_ui.js'],files['afit_member_ui.css'])
    stamp=str(int(time.time()))
    page.with_name(page.name+'.before-limits-'+stamp).write_text(oldpage)
    backend.with_name(backend.name+'.before-limits-'+stamp).write_text(oldserver)
    try:
        page.write_text(newpage);backend.write_text(newserver)
        subprocess.run(['docker','restart','alenafit-assistant-test'],check=True,stdout=subprocess.DEVNULL)
        for attempt in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18080/session',timeout=2) as r:status=json.load(r)
                if status.get('limit')==5:break
            except OSError:pass
            time.sleep(.5)
        else:raise RuntimeError('Chat quota verification failed')
    except Exception:
        page.write_text(oldpage);backend.write_text(oldserver)
        subprocess.run(['docker','restart','alenafit-assistant-test'],stdout=subprocess.DEVNULL);raise
    updater=pathlib.Path('/tmp/afit-meal-limit-update.py');updater.write_text(files['update_ai_meals.py'])
    subprocess.run(['python3',str(updater),'--commit',a.commit],check=True)
    print('ГОТОВО: поле ввода исправлено; без пароля 5 вопросов и 2 ИИ-задачи в сутки. Пароль сохранён.')
if __name__=='__main__':main()
