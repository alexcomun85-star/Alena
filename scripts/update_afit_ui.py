"""Run on the assistant server: python3 update_afit_ui.py. No keys read."""
from pathlib import Path
from datetime import datetime
import ast, re, shutil, subprocess
html = Path('/var/www/alenafit-assistant/index.html')
server = Path('/opt/alenafit-assistant/server.py')
stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
source = html.read_text()
css = '''<style id="afit-fixed-composer">
html,body{height:100%;overflow:hidden}body{height:100dvh;background:#f5f3ed;color:#263b35}
main{height:100%;max-width:760px;margin:auto;padding:0 14px;display:flex;flex-direction:column;min-height:0}
header{flex:none;padding:12px 0 9px}header small{display:none}header h1{font-size:20px;margin:0}header p{font-size:11px;margin:4px 0}
#messages{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:8px 0 14px;scroll-padding-bottom:12px}
.message{font-size:15px;line-height:1.6;margin:8px 0;padding:12px 14px;border-radius:14px}.user{margin-left:24px}
#form{position:static;flex:none;z-index:2;margin:0;padding:9px 0 max(10px,env(safe-area-inset-bottom));border-top:1px solid #ccd5cd;background:#f5f3ed}
#form label{display:none}#question{display:block;min-height:48px;height:56px;max-height:96px;resize:none;font-size:16px;padding:10px 12px}
.actions{margin-top:7px;gap:8px}#send{padding:10px 18px;min-height:44px}#status{font-size:11px}#form>p{display:none}
html.embedded header{display:none}html.embedded main{padding:0 12px}
@media(max-height:400px){#question{height:46px;min-height:46px}#form{padding-top:6px;padding-bottom:6px}.actions{margin-top:4px}#send{padding:6px 16px;min-height:38px}}
</style>'''
js = '''<script id="afit-embed-layout">
if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embedded');
if(window.parent===window&&window.visualViewport){addEventListener('DOMContentLoaded',()=>{const fit=()=>document.body.style.height=window.visualViewport.height+'px';window.visualViewport.addEventListener('resize',fit);fit()})}
</script>'''
source = re.sub(r'<style id="afit-fixed-composer">.*?</style>', '', source, flags=re.S)
source = re.sub(r'<script id="afit-embed-layout">.*?</script>', '', source, flags=re.S)
source = source.replace('<main>', css+js+'\n<main>', 1)
source = source.replace('el.scrollIntoView({block:\'nearest\'});', 'messages.scrollTop=messages.scrollHeight;')
# Show the name once in the initial greeting; omit repeated lead-in introductions.
marker = 'function add(text,user=false){'
if 'AFIT_NO_REPEAT_INTRO' not in source:
    assert source.count(marker)==1, 'Unexpected chat script; no files changed'
    source = source.replace(marker, marker+'''
 // AFIT_NO_REPEAT_INTRO
 if(!user){
  const cleaned=text.replace(/^(?:(?:Здравствуйте|Привет|Добрый день)[!.,\\s]*)?Я\\s*[—–-]?\\s*Афит[\\s\\S]{0,260}?(?:ALENAFIT|Алёны(?:\\s+Висловой)?)[.!]\\s*/i,'').replace(/^(?:Здравствуйте|Привет|Добрый день)[!.,]\\s*/i,'');
  if(cleaned.trim())text=cleaned;
 }
''',1)
# Reinforce the same rule on the server, keeping knowledge and API settings intact.
backend=server.read_text()
rule='Пользователь уже видит приветствие и имя в интерфейсе. Не представляйся повторно, не начинай каждый ответ с приветствия. Сразу отвечай по существу. Если прямо спрашивают, кто ты, ответь кратко.'
if '# AFIT_ONE_INTRO' not in backend:
    marker='        request = urllib.request.Request('
    assert backend.count(marker)==1, 'Unexpected backend; no files changed'
    backend=backend.replace(marker,'        # AFIT_ONE_INTRO\n        payload["instructions"] += '+repr('\n'+rule)+'\n'+marker,1)
    ast.parse(backend)
for p in (html, server):shutil.copy2(p,p.with_name(p.name+'.before-ui-'+stamp))
html.write_text(source)
server.write_text(backend)
result=subprocess.run(['docker','restart','alenafit-assistant-test'],check=False)
if result.returncode:
    print('HTML updated. Backend restart failed; inspect container name with docker ps.')
    raise SystemExit(result.returncode)
print('Готово: одно приветствие; прокрутка только переписки; поле и кнопка закреплены. Обновите страницу сайта.')
