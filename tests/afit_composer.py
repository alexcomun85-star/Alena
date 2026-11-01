import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('update','scripts/update_afit_limits.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
page=Path('tests/fixtures/afita-chat.html').read_text();gate=Path('scripts/afit_access_gate.py').read_text();ui=Path('scripts/afit_member_ui.js').read_text();css=Path('scripts/afit_member_ui.css').read_text()
backend='import json\n'+gate
patched,_=m.patch(page,backend,gate,ui,css)
assert m.patch(patched,backend,gate,ui,css)[0]==patched
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in (320,390,658,1280):
  tab=browser.new_page(viewport={'width':width,'height':780})
  tab.route('**/*',lambda route:route.fulfill(status=200,content_type='application/json',body='{"remaining":5,"limit":5,"member":false}'))
  tab.goto('http://afita.test/');tab.set_content(patched);tab.wait_for_timeout(150)
  result=tab.locator('#question').evaluate('(q)=>({h:q.clientHeight,scroll:q.scrollHeight,top:q.scrollTop,w:q.clientWidth})')
  assert result['h']>=74 and result['scroll']<=result['h']+2,(width,result)
  tab.locator('#question').fill('С чего начать после перерыва? Хочу восстановить привычку к тренировкам.')
  assert tab.locator('#question').evaluate('(q)=>q.scrollHeight<=q.clientHeight+2'),width
  assert tab.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  tab.close()
 browser.close()
print('Composer: full placeholder and typed question visible at 320/390/658/1280; no horizontal overflow; updater idempotent OK')
