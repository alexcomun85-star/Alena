"""Meal generation, advice, persistence, MIME attachment and branded multipage PDF."""
from pathlib import Path
import subprocess,email.policy,email
from playwright.sync_api import sync_playwright,expect
Path('qa-output').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    for width in (320,390,768,1280):
        page.set_viewport_size({'width':width,'height':844})
        page.goto('http://localhost:8766/assistant-tools.html')
        page.get_by_role('button',name='Рацион на неделю',exact=True).click()
        page.locator('[name=menuSource][value=catalog]').check()
        page.locator('[name=mode][value=manual]').check()
        page.locator('#nutrition-target').fill('2000')
        page.locator('#nutrition-goal').select_option('lose')
        page.locator('[name=adult]').check()
        page.locator('.advanced-options>summary').click()
        page.locator('[name=exclude][value=milk]').check()
        page.get_by_role('button',name='Составить мой рацион',exact=True).click()
        expect(page.locator('.week-day')).to_have_count(7)
        text=page.locator('#week-days').text_content()
        assert 'Творог' not in text and 'йогурт' not in text
        before=page.locator('.week-meal h3').first.inner_text()
        page.get_by_role('button',name='Заменить завтрак',exact=True).first.click()
        assert page.locator('.week-meal h3').first.inner_text()!=before
        page.get_by_role('button',name='Сохранить на устройстве',exact=True).click()
        expect(page.locator('#week-status')).to_contain_text('сохранена')
        with page.expect_download() as dl:
            page.get_by_role('button',name='Скачать PDF',exact=True).click()
        path=Path('qa-output')/('week-'+str(width)+'.pdf');dl.value.save_as(path)
        txt=subprocess.check_output(['pdftotext',str(path),'-'],text=True)
        assert all(('День '+str(i)) in txt for i in range(1,8))
        assert 'Продукты на неделю' in txt and 'Основания и ограничения' in txt
        assert txt.count('ALENAFIT')>1 and 'Сила без перегибов' in txt
        page.locator('.email-options>summary').click()
        page.locator('#week-email').fill('test@example.org')
        with page.expect_download() as dl:
            page.get_by_role('button',name='Подготовить письмо с PDF',exact=True).click()
        eml=Path('qa-output')/'week.eml';dl.value.save_as(eml)
        msg=email.message_from_bytes(eml.read_bytes(),policy=email.policy.default)
        assert msg['To']=='test@example.org'
        attachments=list(msg.iter_attachments())
        assert len(attachments)==1 and attachments[0].get_payload(decode=True)==path.read_bytes()
        page.reload()
        page.get_by_role('button',name='Рацион на неделю',exact=True).click()
        page.get_by_role('button',name='Открыть сохранённую неделю',exact=True).click()
        expect(page.locator('.week-day')).to_have_count(7)
        assert page.locator('.week-meal h3').first.inner_text()!=before
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path='qa-output/week-'+str(width)+'.png',full_page=True)
        page.get_by_role('button',name='Что приготовить',exact=True).click()
        page.locator('.nutrition-context>summary').click()
        page.locator('#nutrition-goal').select_option('lose')
        page.locator('#nutrition-sleep').fill('23:00')
        page.locator('#meal-time').fill('22:00')
        page.locator('#ingredients').fill('макароны сосиски майонез')
        page.get_by_role('button',name='Подобрать блюда',exact=True).click()
        expect(page.locator('.nutrition-advice').first).to_contain_text('Отмерьте майонез')
        expect(page.locator('.nutrition-advice').first).to_contain_text('дефицит')
        page.locator('#reflux').check()
        expect(page.locator('.nutrition-advice').first).to_contain_text('Сейчас лучше выбрать другой вариант')
        page.get_by_role('button',name='Продукты и калории',exact=True).click()
        page.locator('.nutrition-context>summary').click()
        page.locator('#reflux').uncheck()
        page.locator('#nutrition-target').fill('2000')
        page.locator('#eaten').fill('1950')
        page.locator('#complete-day').check()
        page.locator('#search').fill('яблоко')
        expect(page.locator('#food-results .nutrition-advice').first).to_contain_text('превышает')
    assert not errors,errors
    browser.close()
print('Nutrition actions: 4 widths, replacements, persistence, advice, PDF and MIME attachment OK')
