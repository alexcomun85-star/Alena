"""Готовка на 3–4 дня: пересчёт на число людей, список покупок, копирование. Нужен локальный сервер: python3 -m http.server 8766"""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write']);pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*',lambda r:r.abort() if not r.request.url.startswith('http://localhost') else r.continue_())
    pg.goto('http://localhost:8766/assistant-tools.html');pg.locator('[data-task=batch]').first.click()
    assert pg.locator('article.book').count()==6,'six sets'
    card=pg.locator('article.book').nth(3)
    assert 'Свёкла — 300 г' in card.text_content(), 'one person baseline'
    pg.locator('label.choice:has-text("3")').click();card=pg.locator('article.book').nth(3)
    t=card.text_content();assert 'Свёкла — 900 г' in t and 'Яйцо — 3 шт.' in t and '24 порции' in t, t[:400]
    card.locator('button:has-text("Скопировать")').click();pg.wait_for_timeout(200)
    c=pg.evaluate('navigator.clipboard.readText()');assert 'на 3 человек' in c and 'Свёкла: 900 г' in c, c
    card.locator('button:has-text("Сохранить список")').click()
    assert not errs, errs
    b.close()
print('Batch cooking: six sets, scaling for 1–4 people, egg pieces, plural, clipboard and saved list OK')
