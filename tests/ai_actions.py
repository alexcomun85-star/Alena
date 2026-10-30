"""UI integration with explicitly mocked provider responses. Never calls a paid model."""
import json, copy, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

fixture=json.loads(Path('tests/fixtures/ai-menu.json').read_text())['body']
fixture['days'][0]['meals'][0]['steps']='1. '+fixture['days'][0]['meals'][0]['steps']+'\n2. Выложите готовую порцию на тарелку.\n3. Подайте сразу после приготовления.'
Path('qa-output').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page();calls=[];errors=[];state={'bad':False}
 page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  r=route.request
  if r.method=='OPTIONS':
   route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return
  if r.method=='GET':
   route.fulfill(json={'ready':True,'message':'Тестовое подключение: контрольные ответы, не реальная генерация.'},headers={'Access-Control-Allow-Origin':'*'});return
  data=r.post_data_json;calls.append(data)
  assert 'weight' not in data and 'height' not in data and 'age' not in data
  assert data['targets']['k']==1800
  if state['bad']:body={'days':[]}
  elif data['action']=='replace':
   meal=copy.deepcopy(fixture['days'][data['day']]['meals'][data['index']]);meal['title']='Контрольная замена одного блюда';body={'meals':[meal]}
  else:body=fixture
  route.fulfill(json={'kind':'ai','version':1,'requestId':data['requestId'],'body':body,'model':'test-fixture','generatedAt':'2026-10-30T12:00:00Z'},headers={'Access-Control-Allow-Origin':'*'})
 page.route('https://assistant.alenafit.com/api/meal-plan**',api)
 page.set_viewport_size({'width':390,'height':844});page.goto('http://localhost:8766/assistant-tools.html')
 page.get_by_role('button',name='Рацион на неделю',exact=True).click()
 expect(page.locator('[name=menuSource][value=ai]')).to_be_enabled()
 page.locator('[name=mode][value=manual]').check();page.locator('#nutrition-target').fill('1800');page.locator('[name=adult]').check()
 page.locator('[name=preferences]').fill('Люблю домашнюю кухню, не предлагать нут.')
 page.get_by_role('button',name='Составить мой рацион',exact=True).click()
 expect(page.locator('.week-day')).to_have_count(7);expect(page.locator('.ai-provenance')).to_contain_text('сама еду не пробую')
 assert len(calls)==1 and calls[0]['preferences'].startswith('Люблю')
 expect(page.locator('.week-meal').first.locator('.cooking-steps li')).to_have_count(3)
 assert page.locator('.week-meal .recipe-source').count()==0
 assert 'ИИ может ошибаться в рецепте' not in page.locator('#week-output').text_content()
 before=page.locator('.week-meal h3').all_text_contents();before_parts=page.locator('.week-day').nth(1).text_content()
 page.get_by_role('button',name='Заменить завтрак',exact=True).first.click()
 expect(page.locator('.week-meal h3').first).to_have_text('Контрольная замена одного блюда')
 after=page.locator('.week-meal h3').all_text_contents();assert after[1:]==before[1:]
 assert page.locator('.week-day').nth(1).text_content()==before_parts
 assert len(calls)==2 and calls[-1]['action']=='replace'
 page.locator('#save-week').click();expect(page.locator('#week-status')).to_contain_text('сохранена')
 with page.expect_download() as dl:page.locator('#week-pdf').click()
 out=Path('qa-output/ai-fixture-week.pdf');dl.value.save_as(out)
 txt=subprocess.check_output(['pdftotext',str(out),'-']).decode()
 assert 'Меню составлено ИИ' in txt and 'КБЖУ независимо пересчитаны' in txt
 assert 'Контрольная замена одного блюда' in txt and 'ALENAFIT' in txt
 assert 'Подайте сразу после приготовления.' in txt
 page.reload();page.get_by_role('button',name='Рацион на неделю',exact=True).click()
 page.locator('#restore-ai').click();expect(page.locator('.week-meal h3').first).to_have_text('Контрольная замена одного блюда')
 assert len(calls)==2,'offline restore must not call the model'
 state['bad']=True
 page.locator('#week-settings > summary').click();page.get_by_role('button',name='Составить мой рацион',exact=True).click()
 expect(page.locator('#week-error')).not_to_be_empty()
 expect(page.locator('.week-meal h3').first).to_have_text('Контрольная замена одного блюда')
 for width in (320,390,768,1280):
  page.set_viewport_size({'width':width,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert not errors,errors
 b.close()
print('AI UI (mocked provider only): preferences, independent macros, single replacement, exact other days, PDF, cached reload and rejected-response preservation OK')
