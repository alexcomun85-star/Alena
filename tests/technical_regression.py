"""Дневник, доступность, локальные шрифты и сохранность офферов.
Запуск рядом с regression.py при работающем BASE. Данные тестовые, сеть — только локальная.
"""
import hashlib
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
from regression import BASE, check, RESULTS, fresh
from audit_regression import local_only

OUT = Path('qa-output')
OUT.mkdir(exist_ok=True)
KEY = 'cycle_diary_v1'
ROW = {'date': '2026-09-01', 'd': 8, 'e': 3, 't': 2}


def t_diary(browser):
    ctx = browser.new_context(service_workers='block', accept_downloads=True)
    local_only(ctx)
    p = fresh(ctx, 'servisy.html', {KEY: json.dumps([ROW])})
    p.fill('#cDay', '12')
    p.click('label[for=cEn3]'); p.click('label[for=cTr2]')
    p.evaluate("""() => {window.originalSet=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k==='cycle_diary_v1')throw Error('quota');return window.originalSet.call(this,k,v)}}""")
    p.click('#cSave')
    check('дневник: отказ записи виден', True, 'Не удалось сохранить' in p.inner_text('#cMsg'))
    check('дневник: при отказе нет новой записи', [ROW], json.loads(p.evaluate("localStorage.getItem('cycle_diary_v1')")))
    check('дневник: счётчик при отказе прежний', 'Записей: 1.', p.inner_text('#cCount'))
    check('дневник: введённый день оставлен', '12', p.input_value('#cDay'))
    p.evaluate('()=>{Storage.prototype.setItem=window.originalSet}')
    p.click('#cSave')
    check('дневник: успешная запись', True, 'Сохранено' in p.inner_text('#cMsg'))
    p.fill('#cDay', '1.5'); p.click('#cSave')
    check('дневник: дробный день отклонён', True, 'целый' in p.inner_text('#cMsg'))
    p.locator('.diary-transfer summary').click()
    with p.expect_download() as got:
        p.click('#cycleExport')
    exported = json.loads(Path(got.value.path()).read_text())
    check('дневник: выгрузка обеих записей', 2, len(exported['diary']))
    check('дневник: настройки не выгружаются без выбора', False, 'settings' in exported)

    def imported(value, accept=True):
        p._accept = accept
        text = value if isinstance(value, str) else json.dumps(value)
        p.set_input_files('#cycleImport', {'name': 'diary.json', 'mimeType': 'application/json', 'buffer': text.encode()})
        p.wait_for_function("document.getElementById('cycleImport').value === ''")

    before = p.evaluate("localStorage.getItem('cycle_diary_v1')")
    imported({'format': 'alenafit-cycle-diary', 'version': 1, 'diary': [dict(ROW, e=7)]})
    check('дневник: неверный импорт сохраняет данные', before, p.evaluate("localStorage.getItem('cycle_diary_v1')"))
    check('дневник: неверный импорт объяснён', True, 'Файл не принят' in p.inner_text('#cycleTransferMsg'))
    imported([ROW], False)
    check('дневник: отмена импорта сохраняет данные', before, p.evaluate("localStorage.getItem('cycle_diary_v1')"))
    imported([ROW])
    check('дневник: старый массив принимается', [ROW], json.loads(p.evaluate("localStorage.getItem('cycle_diary_v1')")))
    p.click('#cycleRestore')
    check('дневник: возврат предыдущей версии', before, p.evaluate("localStorage.getItem('cycle_diary_v1')"))
    p._accept = True
    p.check('#cycleWithSettings')
    package = {'format': 'alenafit-cycle-diary', 'version': 1, 'diary': [ROW], 'settings': {'on': True, 'mode': 'regular', 'len': 30, 'per': 6}, 'start': '2026-09-01'}
    imported(package)
    check('дневник: настройки перенесены по выбору', 30, p.evaluate('Cycle.get().len'))
    check('дневник: дата перенесена по выбору', '2026-09-01', p.evaluate("localStorage.getItem('cycle_start_v1')"))
    check('дневник: ошибок страницы нет', [], p._errors)
    p.close()
    for broken in ['{}', 'null', '{bad']:
        p = fresh(ctx, 'servisy.html', {KEY: broken})
        check('дневник: повреждение '+broken+' объяснено', True, 'повреждены' in p.inner_text('#cMsg'))
        check('дневник: повреждение не ломает страницу', [], p._errors)
        check('дневник: исходник сохранён', broken, p.evaluate("localStorage.getItem('cycle_diary_v1')"))
        p.close()
    p = fresh(ctx, 'progress.html')
    p.evaluate("()=>{Storage.prototype.setItem=function(){throw Error('quota')}}")
    p.locator('#cycPanel input[type=checkbox]').click()
    check('настройки: не показывают несохранённое включение', False, p.is_checked('#cycPanel input[type=checkbox]'))
    check('настройки: ошибка видна снаружи скрытой панели', True, p.locator('.cyc-error').is_visible() and 'Не удалось' in p.inner_text('.cyc-error'))
    p.click('.page-hero .zal-toggle')
    check('избранное: отказ не меняет видимое состояние', 'false', p.get_attribute('.page-hero .zal-toggle','aria-pressed'))
    ctx.close()


def t_ui(browser):
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', is_mobile=True, has_touch=True)
    local_only(ctx)
    p = fresh(ctx, 'index.html')
    p.keyboard.press('Tab')
    check('клавиатура: первым идёт пропуск навигации', True, p.locator('.skip-link').evaluate('(e)=>e===document.activeElement'))
    p.keyboard.press('Enter')
    check('клавиатура: переход к основному содержимому', 'top', p.evaluate('document.activeElement.id'))
    p.click('#dockMenu')
    check('мобильное меню: фон недоступен для фокуса', True, p.locator('main').evaluate('(e)=>e.inert'))
    # Последний доступный элемент — кнопка меню в нижней панели.
    p.locator('#dockMenu').press('Tab')
    check('мобильное меню: Tab остаётся в меню', True, p.evaluate("!!document.activeElement.closest('#mnav')"))
    p.keyboard.press('Escape')
    check('мобильное меню: Escape возвращает фокус', 'dockMenu', p.evaluate('document.activeElement.id'))
    check('мобильное меню: фон снова доступен', False, p.locator('main').evaluate('(e)=>e.inert'))
    check('каталог: сохранены все 12 инструментов', 12, p.locator('#tools .cat').count())
    for href in ['#tools-train', '#tools-food', '#tools-progress']:
        p.locator('.task-nav a[href="'+href+'"]').click()
        check('каталог: цель '+href+' существует', 1, p.locator(href).count())
    for width in [320, 390, 768, 1024, 1200]:
        p.set_viewport_size({'width': width, 'height': 844})
        for page in ['index.html', 'servisy.html', 'vopros.html', 'progress.html']:
            p.goto(BASE + page)
            p.wait_for_load_state('networkidle')
            check(f'новый интерфейс {width} {page}: без переполнения', True, p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        p.goto(BASE+'index.html')
        p.screenshot(path=str(OUT/f'technical-home-{width}.png'), full_page=True)
        if width in [390,1200]:
            p.locator('#tools').scroll_into_view_if_needed()
            p.screenshot(path=str(OUT/f'technical-tools-{width}.png'))
    p.goto(BASE+'servisy.html')
    p.wait_for_function("typeof Tehnika !== 'undefined'")
    check('техника: все 15 иллюстраций имеют текст', 15, p.evaluate('Object.keys(Tehnika.list).length'))
    for slug in p.evaluate('Object.keys(Tehnika.list)'):
        p.evaluate('(s)=>Tehnika.open(s,Tehnika.list[s][0],document.getElementById("wGen"))', slug)
        check('техника '+slug+': три текстовые подсказки', 3, p.locator('.how-copy li').count())
        p.keyboard.press('Escape')
    p.evaluate('Tehnika.open("prised","Приседания с собственным весом",document.getElementById("wGen"))')
    p.locator('.how-in img').wait_for(state='visible')
    p.wait_for_function("document.querySelector('.how-in img').complete")
    p.screenshot(path=str(OUT/'technical-technique.png'))
    p.keyboard.press('Escape')
    check('техника: фокус возвращается', 'wGen', p.evaluate('document.activeElement.id'))
    p.goto(BASE+'servisy.html#dnevnik')
    p.locator('.diary-transfer summary').click()
    p.locator('.diary-transfer').scroll_into_view_if_needed()
    p.screenshot(path=str(OUT/'technical-diary-transfer.png'))
    p.goto(BASE+'vopros.html')
    check('вопросы: будущее состояние названо в навигации', True, 'скоро' in p.inner_text('.toc a[href="#anon"]'))
    check('вопросы: нет обещания работающих комментариев', False, 'комментариях' in p.inner_text('#askBox'))
    ctx.close()


def t_static():
    s=Path('index.html').read_text()
    # Финальное приглашение обновлено по утверждённому дизайну 28.10.2026.
    protected={'plans':'22b99e3634f8f2bbd16a5613deb4468fa20b4061c0c52e451c9bf9e89e55107a', 'quiz':'025dfaaa89ee165c9a924a31fca689cd812603dbd9c029117e7e1e3eb6f7f7e7', 'faq':'3e55f92d141330f5aeeb1919c41e6fc676b190916fe99aee00ea95c2dab32409', 'start':'5229f62ee713f47b5e3e6739fc6d450aaeb417711715384ffb60ce62313ce8eb'}
    for name,digest in protected.items():
        block=re.search('<section[^>]*id="'+name+'".*?</section>',s,re.S)[0]
        check('оффер сохранён: '+name,digest,hashlib.sha256(block.encode()).hexdigest())
    for p in Path('.').glob('*.html'):
        check('нет внешних Google Fonts: '+p.name,False,'fonts.googleapis.com' in p.read_text())
    css=Path('css/fonts.css').read_text()
    for url in re.findall(r'url\(([^)]+)\)',css):
        check('локальный шрифт существует: '+url,True,(Path('css')/url).is_file())



def t_performance(browser):
    samples=[]
    for width in [390,1200]:
        for run in range(3):
            ctx=browser.new_context(viewport={'width':width,'height':844},service_workers='block')
            local_only(ctx)
            p=ctx.new_page()
            external=[]
            p.on('request',lambda r: external.append(r.url) if r.url.startswith('http') and not r.url.startswith(BASE) else None)
            p.add_init_script("""window.__lab={};
              new PerformanceObserver(l=>{window.__lab.lcp=l.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});
              new PerformanceObserver(l=>{window.__lab.fcp=l.getEntries().find(e=>e.name==='first-contentful-paint')?.startTime}).observe({type:'paint',buffered:true});""")
            p.goto(BASE)
            p.wait_for_load_state('networkidle')
            p.evaluate('document.fonts.ready')
            metric=p.evaluate("""()=>({...window.__lab,domReady:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
              localFonts:document.fonts.check('17px "Golos Text"')&&document.fonts.check('700 32px "Unbounded"'),
              resources:performance.getEntriesByType('resource').length})""")
            samples.append({'width':width,'run':run+1,**metric})
            check(f'первый визит {width}/{run+1}: шрифты загружены',True,metric['localFonts'])
            check(f'первый визит {width}/{run+1}: нет внешних запросов',[],external)
            ctx.close()
    (OUT/'lab-performance.json').write_text(json.dumps({'environment':'Local HTTP, Chromium, unthrottled, service worker disabled; laboratory data, not field Core Web Vitals','samples':samples},ensure_ascii=False,indent=2))


def main():
    t_static()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('ALENAFIT_CHROMIUM'))
        t_diary(browser);t_ui(browser);t_performance(browser);browser.close()
    passed=sum(ok for ok,*_ in RESULTS)
    print(f'Технические улучшения: {passed} из {len(RESULTS)} проверок пройдены')
    raise SystemExit(0 if passed==len(RESULTS) else 1)


if __name__=='__main__':main()
