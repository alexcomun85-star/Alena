"""Rename the assistant on its host without changing access or API settings."""
from pathlib import Path
from datetime import datetime
import ast, re, shutil, subprocess
page=Path('/var/www/alenafit-assistant/index.html')
backend=Path('/opt/alenafit-assistant/server.py')
def rename(s):
    for old,new in [('Закрыть Афита','Закрыть Афиту'),('Открыть Афита','Открыть Афиту'),('Спросить Афита','Спросить Афиту'),('Чат с Афитом','Чат с Афитой'),('лимит Афита','лимит Афиты')]:s=s.replace(old,new)
    s=re.sub(r'\bАфит\b','Афита',s)
    s=s.replace('виртуальный помощник','виртуальная помощница').replace('Виртуальный помощник','Виртуальная помощница')
    return s.replace('Афита — помощник','Афита — помощница')
html=rename(page.read_text());code=rename(backend.read_text())
if '# AFITA_FEMALE_V1' not in code:
    marker='        request = urllib.request.Request('
    assert code.count(marker)==1, 'Unexpected server; no files changed'
    rule='Тебя зовут Афита. Ты — виртуальная помощница Алёны Висловой, женского пола. Говори о себе в женском роде: готова, поняла, нашла. Не представляйся повторно в каждом ответе. Используй только новое имя.'
    code=code.replace(marker,'        # AFITA_FEMALE_V1\n        payload["instructions"] += '+repr('\n'+rule)+'\n'+marker,1)
ast.parse(code)
stamp=datetime.now().strftime('%Y%m%d-%H%M%S')
for p in (page,backend):shutil.copy2(p,p.with_name(p.name+'.before-afita-'+stamp))
page.write_text(html);backend.write_text(code)
subprocess.run(['docker','restart','alenafit-assistant-test'],check=True)
print('Готово: Афита — виртуальная помощница Алёны. Обновите страницу сайта.')
