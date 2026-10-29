"""Run against the local preview before releasing assistant actions."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    for width in (320,390,768,1280):
        page.set_viewport_size({'width':width,'height':844})
        page.goto('http://localhost:8766/assistant-tools.html')
        page.locator('#search').fill('яблоко')
        page.locator('#grams').fill('200')
        assert '104 ккал' in page.locator('#results').inner_text()
        page.get_by_text('Включить в итог',exact=True).first.click()
        page.locator('#grams').fill('-1')
        assert 'от 1 до 3000' in page.locator('#results').inner_text()
        page.get_by_role('button',name='Что приготовить',exact=True).click()
        page.locator('#ingredients').fill('курица, гречка')
        assert 'Курица с гречкой' in page.locator('#results').inner_text()
        page.get_by_role('button',name='Подобрать занятия',exact=True).click()
        page.get_by_role('button',name='Подобрать',exact=True).click()
        assert 'онлайн-сопровождение' in page.locator('#result').inner_text()
        page.get_by_role('button',name='Заявка и запись',exact=True).click()
        page.locator('[name=name]').fill('Тест')
        page.locator('[name=message]').fill('<script>alert(1)</script>')
        page.locator('[name=consent]').check()
        page.get_by_role('button',name='Подготовить обращение',exact=True).click()
        assert page.locator('#result script').count()==0
        assert 'Gym_mom1988' in page.locator('#result a').get_attribute('href')
        page.get_by_role('button',name='Итог в PDF',exact=True).click()
        assert '104 ккал' in page.locator('#report').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close()
print('Assistant actions: four viewport sizes, calculations, validation, recipes, format, request escaping and report OK')
