"""Прямая выгрузка PDF/JSON, русские товары, понятные состояния восстановления."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from regression import fresh, BASE, check, RESULTS
from audit_regression import local_only

OUT=Path('qa-output');OUT.mkdir(exist_ok=True)


def pdf(page, selector, name, expected):
    with page.expect_download() as event:
        page.click(selector)
    target=OUT/name
    event.value.save_as(target)
    check(name+': настоящий PDF',True,target.read_bytes().startswith(b'%PDF-1.7'))
    text=subprocess.run(['pdftotext','-layout',str(target),'-'],capture_output=True,text=True,check=True).stdout
    for phrase in expected:check(name+': '+phrase,True,phrase in text)
    subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1500','-png',str(target),str(OUT/target.stem)],check=True,capture_output=True)
    return text


def main():
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('ALENAFIT_CHROMIUM'))
        ctx=b.new_context(viewport={'width':390,'height':844},accept_downloads=True,service_workers='block')
        local_only(ctx)
        p=fresh(ctx,'kalorii.html')
        check('пустой дневник: нет серой кнопки возврата',False,p.is_visible('#foodRestore'))
        check('пустой дневник: есть объяснение копии',True,p.is_visible('#foodBackupHint'))
        p.fill('#fQ','яблоко');p.click('#fRes .fr');p.fill('#fG','200');p.click('#fAdd')
        pdf(p,'#foodPdf','food-mobile.pdf',['Дневник питания','104 ккал','Яблоко'])
        p.fill('#oQ','молоко');p.click('#oBtn')
        p.wait_for_function("!document.getElementById('oBtn').disabled")
        check('товары: русское название найдено локально',True,'сохранённой выборки' in p.inner_text('#oMsg'))
        check('товары: есть результаты',True,p.locator('#oRes .fr').count()>0)
        p.screenshot(path=str(OUT/'russian-products-mobile.png'))
        seen=[]
        def remote(route):
            seen.append(route.request.post_data_json)
            route.fulfill(json={'hits':[None,{'product_name':{'ru':'неверный тип'}},{'code':'4600000000000','product_name_ru':'Проверка кириллицы','nutriments':{'energy-kcal_100g':100,'proteins_100g':5,'fat_100g':4,'carbohydrates_100g':11}}]})
        ctx.route('https://search.openfoodfacts.org/search',remote)
        p.fill('#oQ','Проверка кириллицы');p.click('#oBtn');p.wait_for_function("!document.getElementById('oBtn').disabled")
        check('внешний поиск: языки ru/en', ['ru','en'],seen[0]['langs'])
        check('внешний поиск: кириллица сохраняется', 'Проверка кириллицы',seen[0]['q'])
        check('внешний поиск: результат отображён',True,'Проверка кириллицы' in p.inner_text('#oRes'))
        p.evaluate("""()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
          Object.defineProperty(navigator,'share',{configurable:true,value:({files})=>{window.shared={name:files[0].name,type:files[0].type};return Promise.resolve()}})}""")
        p.click('#foodExport');p.wait_for_function('window.shared')
        check('iOS-путь: файл данных JSON, не PDF','application/json',p.evaluate('window.shared.type'))
        p.close()
        p=fresh(ctx,'progress.html')
        p.fill('#pEx','Присед');p.fill('#pW','40');p.fill('#pR','8');p.fill('#pS','3');p.click('#pAdd')
        pdf(p,'#pdfBtn','progress-mobile.pdf',['Отчёт о прогрессе','Присед','Силовые'])
        check('PDF: без выбранных замеров нет данных тела',False,'Замеры' in p.inner_text('#report'))
        p.close()
        p=fresh(ctx,'vozvrat.html');p.click('#vGen')
        pdf(p,'[data-pdf-root="vOut"]','plan-mobile.pdf',['Неделя'])
        p.close()
        p=fresh(ctx,'korzina.html');p.check('#kz0_0')
        txt=pdf(p,'[data-pdf-root="kzPrint"]','shopping-mobile.pdf',['Список покупок','Яйца'])
        check('корзина: невыбранные продукты не попали в PDF',False,'Гречка' in txt)
        check('корзина: флажок читается без замены на вопрос',True,'[ ]' in txt and '?' not in txt)
        p.close()
        p=fresh(ctx,'index.html');p.click('#dockMenu')
        check('меню: полупрозрачный фон',True,'0.88' in p.locator('#mnav').evaluate('(e)=>getComputedStyle(e).backgroundColor'))
        check('меню: есть размытие',True,'18px' in p.locator('#mnav').evaluate('(e)=>getComputedStyle(e).backdropFilter'))
        p.wait_for_function("getComputedStyle(document.querySelector('.mnav-in')).opacity==='1'")
        p.screenshot(path=str(OUT/'glass-menu-mobile.png'))
        ctx.close();b.close()
    passed=sum(x[0] for x in RESULTS)
    print(f'Замечания с телефона: {passed} из {len(RESULTS)} проверок пройдены')
    raise SystemExit(0 if passed==len(RESULTS) else 1)


if __name__=='__main__':main()
