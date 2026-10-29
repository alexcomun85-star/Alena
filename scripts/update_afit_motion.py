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
# Progressive display after the real API response; not simulated network streaming.
if '// AFIT_TYPING_V1' not in source:
    assert source.count("form.addEventListener('submit',async event=>{")==1, 'Unexpected form; no files changed'
    assert source.count('  add(data.answer);')==1, 'Unexpected answer handler; no files changed'
    source=source.replace("form.addEventListener('submit',async event=>{", "\n// AFIT_TYPING_V1\nfunction showThinking(){\n const el=document.createElement('div');el.className='message afit-thinking';el.setAttribute('role','status');el.setAttribute('aria-label','Афит печатает');\n const label=document.createElement('span');label.textContent='Афит печатает';el.append(label);\n for(let i=0;i<3;i++){const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');el.append(dot)}\n messages.append(el);messages.scrollTop=messages.scrollHeight;return el;\n}\nasync function typeAnswer(text){\n add(text);\n if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;\n const el=messages.lastElementChild,content=document.createDocumentFragment();\n while(el.firstChild)content.append(el.firstChild);\n const full=content.textContent||'',node=document.createTextNode('');el.append(node);el.classList.add('afit-writing');el.setAttribute('aria-hidden','true');\n const duration=Math.min(5000,Math.max(600,full.length*9));\n await new Promise(resolve=>{let start=0;\n  function step(time){if(!start)start=time;const progress=Math.min(1,(time-start)/duration);\n   const follow=messages.scrollHeight-messages.scrollTop-messages.clientHeight<70;\n   node.textContent=full.slice(0,Math.ceil(full.length*progress));if(follow)messages.scrollTop=messages.scrollHeight;\n   if(progress<1)requestAnimationFrame(step);else resolve();\n  }requestAnimationFrame(step);\n });\n el.replaceChildren(content);el.classList.remove('afit-writing');el.removeAttribute('aria-hidden');\n}\n"+"\nform.addEventListener('submit',async event=>{",1)
    source=source.replace(" status.textContent='Готовлю ответ…';", " status.textContent='Афит печатает…';\n const waiting=showThinking();",1)
    source=source.replace('  add(data.answer);', "  waiting.remove();\n  await typeAnswer(data.answer);",1)
    source=source.replace(' }catch(error){', ' }catch(error){\n  waiting.remove();',1)
    source=source.replace('  clearTimeout(timeout);', '  waiting.remove();\n  clearTimeout(timeout);',1)
source=re.sub(r'<style id="afit-typing-motion">.*?</style>', '', source, flags=re.S)
source=source.replace('<main>', '<style id="afit-typing-motion">\n.afit-thinking{display:flex;align-items:center;gap:5px;font-size:13px;color:#63736c;min-height:43px}.afit-thinking span{margin-right:5px}.afit-thinking i{width:5px;height:5px;background:currentColor;border-radius:50%;animation:afit-dot 1.2s ease-in-out infinite}.afit-thinking i:nth-of-type(2){animation-delay:.15s}.afit-thinking i:nth-of-type(3){animation-delay:.3s}\n.afit-writing:after{content:"";display:inline-block;vertical-align:-.1em;width:2px;height:1em;background:currentColor;margin-left:3px;animation:afit-caret .8s steps(2) infinite}\n@keyframes afit-dot{0%,70%,100%{opacity:.3;transform:translateY(0)}35%{opacity:1;transform:translateY(-3px)}}@keyframes afit-caret{50%{opacity:0}}\n@media(prefers-reduced-motion:reduce){.afit-thinking i,.afit-writing:after{animation:none}}\n</style>'+'\n<main>',1)

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
print('Готово: плавный вывод ответов, индикатор печати и закреплённая форма. Обновите страницу сайта.')

