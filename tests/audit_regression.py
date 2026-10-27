"""Проверки исправлений аудита: питание, вкладки, размеры Fold и работа без сети.

Запуск рядом с regression.py при работающем http://localhost:8766/.
Это эмуляция размеров Chromium; она не заменяет проверку реального устройства.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
from regression import BASE, check, RESULTS, fresh

OUT = Path('qa-output')
OUT.mkdir(exist_ok=True)
FOOD = {
    'custom': [{'id': 'c123', 'name': 'Продукт для проверки', 'k': 210, 'p': 10,
                'f': 10, 'c': 20, 'pg': 100, 'pl': '100 г'}],
    'days': {'2026-10-01': [{'name': 'Продукт для проверки', 'g': 200, 'meal': 'Обед',
                            'k': 420, 'p': 20, 'f': 20, 'c': 40}]},
}


def local_only(ctx):
    host = urlsplit(BASE).netloc
    ctx.route('**/*', lambda r: r.continue_() if urlsplit(r.request.url).netloc == host else r.abort())


def state(page):
    return page.evaluate("localStorage.getItem('food_v1')")


def own_product(page):
    for key, value in [('cName', 'Проверка сохранения'), ('cP', '10'), ('cF', '10'), ('cC', '20')]:
        page.fill('#' + key, value)
    page.click('#cAdd')


def t_food(browser):
    ctx = browser.new_context(accept_downloads=True, service_workers='block')
    local_only(ctx)
    p = fresh(ctx, 'kalorii.html')
    own_product(p)
    check('еда: независимый расчёт 10×4 + 10×9 + 20×4', 210, json.loads(state(p))['custom'][0]['k'])
    for weight in ['', '0', '-100', '0.5', '3001']:
        before = state(p)
        p.fill('#fG', weight)
        preview = p.inner_text('#fSelCalc')
        p.click('#fAdd')
        check('еда: неверный вес ' + repr(weight), before, state(p))
        check('еда: нет отрицательных калорий ' + repr(weight), False, '-52' in preview)
    p.fill('#fG', '200')
    check('еда: предпросмотр порции 200 г', True, '420 ккал' in p.inner_text('#fSelCalc'))
    p.click('#fAdd')
    check('еда: сохранённая порция 200 г', 420, next(iter(json.loads(state(p))['days'].values()))[0]['k'])

    # Проверка записи, запрещённой браузером: введённое не исчезает, успех не обещается.
    raw = state(p)
    p.evaluate("""() => { const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k==='food_v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v)} }""")
    own_product(p)
    check('еда: сбой записи не меняет данные', raw, state(p))
    check('еда: при сбое поля остаются', 'Проверка сохранения', p.input_value('#cName'))
    check('еда: при сбое нет ложного успеха', True, 'Не удалось сохранить' in p.inner_text('#cMsg'))
    p.close()

    p = fresh(ctx, 'kalorii.html', {'food_v1': json.dumps(FOOD, ensure_ascii=False)})
    with p.expect_download() as d:
        p.click('#foodExport')
    exported = json.loads(Path(d.value.path()).read_text())
    check('еда: выгрузка сохраняет продукты и записи', FOOD, exported['data'])
    original = state(p)

    def imported(value, accept=True):
        p._accept = accept
        payload = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        file = OUT / 'food-import.json'
        file.write_text(payload)
        p.set_input_files('#foodImport', str(file.resolve()))
        p.wait_for_function("document.getElementById('foodImport').value === ''")

    for name, value in [
        ('не JSON', '{'),
        ('нет списков', {}),
        ('повреждённый список', {'custom': None, 'days': {}}),
        ('неверная дата', {'custom': [], 'days': {'2026-02-30': []}}),
        ('бесконечность', '{"custom":[{"id":"c1","name":"x","k":1e309,"p":0,"f":0,"c":0}],"days":{}}'),
        ('неподдерживаемая версия', {'format': 'alenafit-food', 'version': 2, 'data': FOOD}),
        ('отрицательная порция', {'custom': [], 'days': {'2026-10-01': [dict(FOOD['days']['2026-10-01'][0], g=-1)]}}),
    ]:
        imported(value)
        check('еда: импорт отклонён — ' + name, original, state(p))
        check('еда: причина отказа — ' + name, True, 'Файл не принят' in p.inner_text('#foodTransferMsg'))
    other = {'custom': [], 'days': {}}
    imported(other, accept=False)
    check('еда: отмена импорта сохраняет дневник', original, state(p))
    imported({'format': 'alenafit-food', 'version': 1, 'data': other})
    check('еда: корректный импорт', other, json.loads(state(p)))
    check('еда: резервная копия до замены', original, p.evaluate("localStorage.getItem('food_v1_backup')"))
    p.click('#foodRestore')
    check('еда: восстановление после импорта', FOOD, json.loads(state(p)))
    p.click('#fWipe'); p.click('#fWipe')
    check('еда: очистка с возможностью возврата', other, json.loads(state(p)))
    p.click('#foodRestore')
    check('еда: возврат после очистки', FOOD, json.loads(state(p)))
    p.close()
    p = fresh(ctx, 'kalorii.html', {'food_v1': '{broken'})
    own_product(p)
    check('еда: повреждённое хранилище не затирается', '{broken', state(p))
    check('еда: повреждение не ломает страницу', [], p._errors)
    ctx.close()


def t_tabs(browser):
    ctx = browser.new_context(service_workers='block')
    local_only(ctx)
    # Ответы приходят после переключения вкладки: загрузка не должна менять выбор.
    ctx.route('**/data/*.json', lambda r: r.fulfill(json={
        'updated': '2026-10-27', 'items': [{'title': 'Материал', 'text': 'Пост', 'link': 'https://example.com', 'date': '2026-10-27'}]}))
    p = ctx.new_page()
    p.goto(BASE)
    p.wait_for_load_state('networkidle')
    check('вкладки: после загрузки видна одна панель', 1, p.locator('[role=tabpanel]:visible').count())
    p.click('#tab-ch')
    check('вкладки: выбран канал', ['panel-ch'], p.locator('[role=tabpanel]:visible').evaluate_all('els=>els.map(e=>e.id)'))
    p.click('#tab-sci')
    check('вкладки: возврат к науке', ['panel-sci'], p.locator('[role=tabpanel]:visible').evaluate_all('els=>els.map(e=>e.id)'))
    ctx.close()


def t_fold(browser):
    ctx = browser.new_context(viewport={'width': 360, 'height': 800}, is_mobile=True,
                              has_touch=True, service_workers='block')
    local_only(ctx)
    p = ctx.new_page()
    for width, height in [(320, 740), (360, 740), (390, 844), (700, 850),
                          (768, 900), (900, 700), (1023, 700), (1024, 768), (1200, 900), (740, 360)]:
        p.set_viewport_size({'width': width, 'height': height})
        for path in ['index.html', 'servisy.html', 'kalorii.html', 'progress.html', 'recepty.html', 'moy-zal.html']:
            p.goto(BASE + path)
            p.wait_for_load_state('networkidle')
            check(f'{width}×{height} {path}: нет горизонтального переполнения', True,
                  p.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            check(f'{width}×{height} {path}: нужное меню', width < 1024, p.is_visible('.dock'))
            if path == 'index.html':
                p.screenshot(path=str(OUT / f'home-{width}x{height}.png'), full_page=True)

    p.set_viewport_size({'width': 390, 'height': 844})
    p.goto(BASE + 'kalorii.html')
    p.fill('#cName', 'Сохранить при раскрытии')
    p.click('#dockMenu')
    for width in [768, 1024, 900, 390]:
        p.set_viewport_size({'width': width, 'height': 844})
        if width == 768:
            check('Fold: мобильное меню остаётся открытым в промежуточной ширине', True, p.is_visible('#mnav'))
        else:
            check(f'Fold {width}: скрытое меню не блокирует прокрутку', False,
                  p.evaluate("document.body.classList.contains('menu-open')"))
        check(f'Fold {width}: введённый текст сохранён', 'Сохранить при раскрытии', p.input_value('#cName'))
    p.click('#dockMenu')
    check('Fold: после возврата на узкий экран меню работает', True, p.is_visible('#mnav'))
    p.click('#dockMenu')
    # Короткое окно моделирует доступное место при клавиатуре; реальную клавиатуру не эмулирует.
    p.set_viewport_size({'width': 390, 'height': 400})
    p.fill('#cP', '10')
    check('короткое окно: поле остаётся доступно', True, p.is_visible('#cP'))
    check('короткое окно: панель не выходит за экран', True,
          p.locator('.dock').evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight+1'))
    ctx.close()


def t_offline(browser):
    ctx = browser.new_context(viewport={'width': 390, 'height': 844})
    local_only(ctx)
    p = ctx.new_page()
    p.goto(BASE)
    p.wait_for_function('navigator.serviceWorker.controller !== null', timeout=60000)
    ctx.set_offline(True)
    for path in ['progress.html', 'kalorii.html', 'vozvrat.html', 'servisy.html']:
        p.goto(BASE + path)
        check('без сети: страница ' + path, True, p.locator('h1').count() == 1)
        check('без сети: стили ' + path, '48px',
              p.locator('.tbtn').first.evaluate('(e)=>getComputedStyle(e).minHeight'))
        check('без сети: навигация ' + path, True, p.locator('#dockMenu').count() == 1)
        if path == 'kalorii.html':
            p.fill('#fQ', 'яблоко');p.click('#fRes .fr')
            p.fill('#fG', '200')
            check('без сети: калькулятор работает на новой странице', True, '104 ккал' in p.inner_text('#fSelCalc'))
    p.screenshot(path=str(OUT / 'offline.png'))
    ctx.close()


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        t_food(browser)
        t_tabs(browser)
        t_fold(browser)
        t_offline(browser)
        browser.close()
    failed = [r for r in RESULTS if not r[0]]
    (OUT / 'results.json').write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2))
    print(f'Аудит: {len(RESULTS) - len(failed)} из {len(RESULTS)} проверок пройдены')
    raise SystemExit(1 if failed else 0)


if __name__ == '__main__':
    main()
