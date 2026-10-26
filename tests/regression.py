"""Регрессионные проверки ошибок из функционального аудита (октябрь 2026).

Запуск из корня репозитория:
    python3 -m http.server 8766 &      # локальный сервер
    python3 tests/regression.py         # нужен Python Playwright с Chromium

Проверяет: импорт резервной копии, тоннаж, проверку ввода (журнал, калькулятор еды,
калькулятор активности), интервальный таймер, генераторы тренировок, рецепты, печатный отчёт.
Выход с кодом 1, если хоть одна проверка не прошла.
"""
import json
import os
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:8766/")
OUT = tempfile.mkdtemp(prefix="alenafit-qa-")
RESULTS = []


def check(name, expected, actual, ok=None):
    ok = (expected == actual) if ok is None else ok
    RESULTS.append((ok, name, expected, actual))
    sh = lambda v: (str(v)[:90] + "…") if len(str(v)) > 90 else str(v)
    print(("OK   " if ok else "FAIL ") + name + f" | ожидалось: {sh(expected)} | получилось: {sh(actual)}")


VALID = {
    "lifts": [
        {"date": "2026-09-01", "ex": "Присед", "w": 40, "r": 8, "s": 3},
        {"date": "2026-09-15", "ex": "Присед", "w": 45, "r": 8, "s": 3},
    ],
    "tests": [{"date": "2026-09-01", "srt": 8, "chair": 14, "bal": 2}],
    "act": [{"week": "2026-09-07", "steps": 6500, "min": 60, "days": 2}],
    "body": [{"date": "2026-09-01", "waist": 72, "hips": 98, "weight": 61}],
    "name": "Тест",
}


def fresh(ctx, path, storage=None):
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page._accept = True
    page.on("dialog", lambda dl: dl.accept() if page._accept else dl.dismiss())
    page.goto(BASE + path)
    page.evaluate("localStorage.clear()")
    if storage:
        for k, v in storage.items():
            page.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, v])
    page.reload()
    page.wait_for_load_state("networkidle")
    page._errors = errors
    return page


def export(page):
    with page.expect_download() as d:
        page.click("#expBtn")
    return json.loads(open(d.value.path(), encoding="utf-8").read())


def import_file(page, content, accept=True):
    fn = os.path.join(OUT, "imp.json")
    open(fn, "w", encoding="utf-8").write(content if isinstance(content, str) else json.dumps(content, ensure_ascii=False))
    page._accept = accept
    page.set_input_files("#impFile", fn)
    page.wait_for_timeout(300)
    return page.inner_text("#bkMsg")


def t_import(ctx):
    page = fresh(ctx, "progress.html", {"progress_v1": json.dumps(VALID, ensure_ascii=False)})
    before = export(page)
    raw_before = page.evaluate("localStorage.getItem('progress_v1')")
    bad = {
        "пример из аудита: lifts: [], tests: {}": {"lifts": [], "tests": {}},
        "повреждённый JSON": '{"lifts": [',
        "массив вместо объекта": [],
        "нет раздела lifts": {"tests": []},
        "lifts — строка": {"lifts": "x"},
        "отрицательный вес": {"lifts": [{"date": "2026-09-01", "ex": "Присед", "w": -40, "r": 8, "s": 3}]},
        "дробные повторы": {"lifts": [{"date": "2026-09-01", "ex": "Присед", "w": 40, "r": 1.5, "s": 3}]},
        "вес строкой": {"lifts": [{"date": "2026-09-01", "ex": "Присед", "w": "40", "r": 8, "s": 3}]},
        "несуществующая дата 30.02": {"lifts": [{"date": "2026-02-30", "ex": "Присед", "w": 40, "r": 8, "s": 3}]},
        "пустое упражнение": {"lifts": [{"date": "2026-09-01", "ex": " ", "w": 40, "r": 8, "s": 3}]},
        "8 дней силовых": {"lifts": [], "act": [{"week": "2026-09-07", "steps": 5000, "min": 60, "days": 8}]},
        "−100 шагов": {"lifts": [], "act": [{"week": "2026-09-07", "steps": -100, "min": 60, "days": 2}]},
        "−30 минут": {"lifts": [], "act": [{"week": "2026-09-07", "steps": 100, "min": -30, "days": 2}]},
        "повтор недели": {"lifts": [], "act": [{"week": "2026-09-07", "steps": 1}, {"week": "2026-09-07", "steps": 2}]},
        "вес тела 1000 кг": {"lifts": [], "body": [{"date": "2026-09-01", "weight": 1000}]},
        "баланс 5": {"lifts": [], "tests": [{"date": "2026-09-01", "bal": 5}]},
        "пустая запись тестов": {"lifts": [], "tests": [{"date": "2026-09-01"}]},
        "имя — число": {"lifts": [], "name": 123},
        "запись — строка": {"lifts": ["x"]},
    }
    for name, content in bad.items():
        msg = import_file(page, content)
        after_raw = page.evaluate("localStorage.getItem('progress_v1')")
        check(f"импорт отклонён: {name}", "отклонён, данные те же", "отклонён, данные те же" if ("не принят" in msg and after_raw == raw_before) else f"{msg[:60]} / изменено={after_raw != raw_before}")
    after = export(page)
    check("экспорт до и после неудачных импортов совпадает", True, before == after)
    check("ошибок JavaScript на странице нет", [], page._errors)
    # отмена в диалоге
    other = {"lifts": [{"date": "2026-10-01", "ex": "Жим", "w": 20, "r": 10, "s": 3}]}
    import_file(page, other, accept=False)
    check("отмена в окне подтверждения не меняет данные", raw_before, page.evaluate("localStorage.getItem('progress_v1')"))
    # успешная замена с резервной копией и возвратом
    msg = import_file(page, other, accept=True)
    cur = json.loads(page.evaluate("localStorage.getItem('progress_v1')"))
    bk = json.loads(page.evaluate("localStorage.getItem('progress_v1_backup')") or "null")
    check("корректный импорт заменяет данные", 1, len(cur["lifts"]) if cur["tests"] == [] else -1)
    check("перед заменой сохранена копия прежних данных", before, json.loads(bk["data"]) if bk else None)
    page._accept = True
    page.click("#bkBack")
    page.wait_for_timeout(200)
    check("кнопка «Вернуть предыдущие данные» восстанавливает данные", before, export(page))
    page.close()
    # уже повреждённое хранилище (как после старой версии импорта)
    page = fresh(ctx, "progress.html", {"progress_v1": json.dumps({"lifts": VALID["lifts"], "tests": {}}, ensure_ascii=False)})
    check("страница с повреждённым хранилищем открывается без ошибок", [], page._errors)
    bk = json.loads(page.evaluate("localStorage.getItem('progress_v1_backup')") or "null")
    check("исходное повреждённое хранилище сохранено копией", True, bool(bk) and json.loads(bk["data"]).get("tests") == {})
    check("корректные записи из повреждённого хранилища видны", True, "Присед" in page.inner_text("#vLifts"))
    page.close()


LIFTS_A = [
    {"date": "2026-09-01", "ex": "Присед", "w": 50, "r": 5, "s": 3},
    {"date": "2026-09-01", "ex": "Присед", "w": 60, "r": 5, "s": 1},
    {"date": "2026-09-08", "ex": "Присед", "w": 50, "r": 7, "s": 3},
]


def tonnage_cell(page):
    return page.eval_on_selector("#vLifts table tbody tr", "tr=>tr.cells[5].textContent")


def t_tonnage(ctx):
    for label, lifts in (("прямой порядок", LIFTS_A), ("обратный порядок", [LIFTS_A[1], LIFTS_A[0], LIFTS_A[2]]), ("все записи наоборот", LIFTS_A[::-1])):
        page = fresh(ctx, "progress.html", {"progress_v1": json.dumps({"lifts": lifts, "tests": [], "act": [], "body": [], "name": ""}, ensure_ascii=False)})
        check(f"тоннаж 1 050 → 1 050 кг на странице ({label})", "0%", tonnage_cell(page))
        page.evaluate("window.print=function(){}")
        page.click("#pdfBtn")
        rep = page.eval_on_selector("#report table tbody tr", "tr=>tr.cells[5].textContent")
        check(f"тоннаж в отчёте ({label})", "0%", rep)
        page.close()


def t_validation(ctx):
    page = fresh(ctx, "progress.html", {"progress_v1": json.dumps(VALID, ensure_ascii=False)})
    raw = page.evaluate("localStorage.getItem('progress_v1')")
    for steps, mins, days, case in (("-100", "60", "2", "−100 шагов"), ("5000", "-30", "2", "−30 минут"), ("5000", "60", "8", "8 дней"), ("5000", "60", "2.5", "2,5 дня"), ("70000", "60", "2", "70 000 шагов")):
        page.fill("#aSteps", steps); page.fill("#aMin", mins); page.fill("#aDays", days)
        page.click("#aAdd")
        check(f"активность в журнале не сохранена: {case}", raw, page.evaluate("localStorage.getItem('progress_v1')"))
    page.fill("#aSteps", "6000"); page.fill("#aMin", "60"); page.fill("#aDays", "2"); page.click("#aAdd")
    check("корректная неделя активности сохраняется", True, page.evaluate("localStorage.getItem('progress_v1')") != raw)
    page.close()

    page = fresh(ctx, "kalorii.html")
    def add(name, k, p, f, c):
        page.fill("#cName", name); page.fill("#cK", k); page.fill("#cP", p); page.fill("#cF", f); page.fill("#cC", c)
        page.click("#cAdd")
        st = json.loads(page.evaluate("localStorage.getItem('food_v1')") or '{"custom":[]}')
        return [x["name"] for x in st.get("custom", [])], page.inner_text("#cMsg")
    names, _ = add("Минус белок", "", "-10", "5", "5")
    check("продукт с −10 г белка не сохранён", False, "Минус белок" in names)
    names, _ = add("Восемьдесят", "", "80", "80", "80")
    check("продукт Б80/Ж80/У80 не сохранён", False, "Восемьдесят" in names)
    names, _ = add("Восемьдесят с ккал", "400", "80", "80", "80")
    check("продукт Б80/Ж80/У80 с указанными калориями не сохранён", False, "Восемьдесят с ккал" in names)
    names, _ = add("Минус ккал", "-5", "1", "1", "1")
    check("продукт с отрицательными калориями не сохранён", False, "Минус ккал" in names)
    names, _ = add("Сумма 101", "", "40", "30", "31")
    check("сумма БЖУ 101 г (в пределах допуска 1,5 г) сохраняется", True, "Сумма 101" in names)
    names, msg = add("Расхождение", "500", "10", "10", "10")
    check("сильное расхождение калорий: сохранено как введено + предупреждение", True, "Расхождение" in names and "отличаются" in msg)
    st = json.loads(page.evaluate("localStorage.getItem('food_v1')"))
    item = next(x for x in st["custom"] if x["name"] == "Расхождение")
    check("калории не «исправлены» автоматически", 500, item["k"])
    names, _ = add("Творог 5% своя", "121", "17.2", "5", "1.8")
    check("корректный продукт сохраняется", True, "Творог 5% своя" in names)
    page.close()

    page = fresh(ctx, "testy.html")
    def calc(s, m, d, a):
        page.fill("#cSteps", s); page.fill("#cStr", m); page.fill("#cStrDays", d); page.fill("#cAer", a)
        return page.eval_on_selector("#calcOut", "e=>e.textContent")
    out = calc("8000", "60", "8", "150")
    check("калькулятор: 8 дней — без положительной оценки", False, "в зоне пользы" in out)
    out = calc("-100", "", "", "")
    check("калькулятор: −100 шагов — без оценки", False, "в зоне пользы" in out or "можно добавить" in out)
    out = calc("8000", "60", "2", "150")
    check("калькулятор: корректные значения оцениваются", 4, out.count("в зоне пользы"))
    page.close()


def t_timer(ctx):
    page = ctx.new_page()
    page.clock.install()
    page.goto(BASE + "servisy.html")
    page.wait_for_load_state("domcontentloaded")

    def setup(w, r, n):
        page.fill("#tW", str(w)); page.fill("#tR", str(r)); page.fill("#tN", str(n)); page.click("#tReset")

    def run(seconds_until_done_max=120):
        page.click("#tStart")
        t = 0.0
        while t < seconds_until_done_max:
            page.clock.run_for(100)
            t += 0.1
            if page.get_attribute("#iT", "data-phase") == "done":
                return round(t, 1)
        return None

    for (w, r, n, total) in ((5, 2, 2, "0:12"), (5, 2, 1, "0:05"), (5, 0, 2, "0:10"), (40, 20, 10, "9:40")):
        setup(w, r, n)
        shown = page.inner_text("#tRound").split("всего ")[1].split(" ")[0]
        check(f"таймер {w}/{r}×{n}: показано «всего»", total, shown)
        if w * n + r * (n - 1) <= 20:
            dur = run()
            exp = w * n + r * (n - 1)
            check(f"таймер {w}/{r}×{n}: фактическая длительность, с", exp, dur, ok=dur is not None and abs(dur - exp) <= 0.3)

    setup(5, 2, 2)
    page.click("#tStart"); page.clock.run_for(3000)
    page.click("#tStart")  # пауза
    paused = page.inner_text("#tTime")
    page.clock.run_for(5000)
    check("таймер: на паузе время не идёт", paused, page.inner_text("#tTime"))
    check("таймер: на паузе кнопка «Продолжить»", "Продолжить", page.inner_text("#tStart"))
    t = 3.0
    page.click("#tStart")
    while page.get_attribute("#iT", "data-phase") != "done" and t < 60:
        page.clock.run_for(100); t += 0.1
    check("таймер: пауза 5 с не меняет рабочую длительность (12 с)", 12.0, round(t, 1), ok=abs(t - 12) <= 0.3)
    page.click("#tReset")
    check("таймер: сброс", ("ready", "Старт"), (page.get_attribute("#iT", "data-phase"), page.inner_text("#tStart")))
    page.close()


ONE_SIDED = ["Выпады назад попеременно", "Ягодичный мост на одной ноге", "Сплит-присед", "Выпады назад с гантелями", "на одной ноге", "Тяга гантели в наклоне с опорой", "«Мёртвый жук»", "Паллоф", "Перенос гантели", "Боковая планка"]
SUPPORT = ["дверного косяка", "Тяга под столом", "Отжимания от стола", "Отжимания от опоры", "с опорой на скамью или стул"]


def t_generators(ctx):
    page = fresh(ctx, "servisy.html")
    bad_side, bad_hold, bad_sup, bad_note = [], [], [], []
    for t in ("15", "25", "40"):
        page.click(f"label[for=wt{t}]")
        for p in ("h", "d", "g"):
            page.click(f"label[for=wp{p}]")
            for _ in range(25):
                page.click("#wNew")
                items = page.eval_on_selector_all("#wOut .wlist li", "ls=>ls.map(l=>l.textContent)")
                text = page.eval_on_selector("#wOut", "e=>e.textContent")
                for it in items:
                    if any(k in it for k in ONE_SIDED) and "на каждую сторону" not in it:
                        bad_side.append(it)
                    if "ланка на предплечьях" in it and "секунд" not in it:
                        bad_hold.append(it)
                    if any(k in it for k in SUPPORT) and "Если опора" not in text:
                        bad_sup.append(it)
                if not text.startswith("Около") or "общий шаблон" not in text:
                    bad_note.append(text[:40])
    check("генератор: односторонние упражнения — «на каждую сторону»", [], sorted(set(bad_side)))
    check("генератор: статические упражнения — в секундах", [], sorted(set(bad_hold)))
    check("генератор: для опоры на мебель/косяк есть условия и замена", [], sorted(set(bad_sup)))
    check("генератор: время «около», пометка «общий шаблон»", [], bad_note[:3])
    page.close()

    page = fresh(ctx, "vozvrat.html")
    page.eval_on_selector("input[name=vm][value=dumb]", "e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.click("#vGen")
    text = page.eval_on_selector("#vOut", "e=>e.textContent")
    check("план возвращения: блок «Если опора — мебель»", True, "Если опора — мебель" in text)
    check("план возвращения: время помечено как примерное", True, "примерно 40–50 минут" in text)
    page.close()


def t_fooddb(ctx):
    page = fresh(ctx, "kalorii.html")
    page.fill("#fQ", "Гречка варёная")
    page.click("#fRes .fr")
    info = page.inner_text("#fSelInfo")
    href = page.eval_on_selector("#fSelInfo a", "a=>a.href")
    check("база: у продукта USDA видны состояние и ссылка на запись", True, "(варёная)" in info and href.endswith("/food-details/170686/nutrients"))
    n = page.evaluate("window.FOOD_DB.length")
    check("база: все 107 записей на месте", 107, n)
    no_id = page.evaluate("window.FOOD_DB.filter(r=>r[6]==='U'&&!((window.FOOD_META[r[0]]||[])[1])).map(r=>r[0])")
    check("база: у всех записей USDA есть ID (кроме сводного кофе/чая)", ["Кофе, чай без сахара"], no_id)
    page.close()


def t_recipes(ctx):
    page = fresh(ctx, "recepty.html")
    text = page.eval_on_selector("#rcList", "e=>e.textContent")
    check("рецепты: пояснение про мёд и вариант без него", True, "Мёд (1 ч. л., 5 г) включён" in text and "Без необязательных ингредиентов" in text)
    check("рецепты: пояснение про выход курицы и рыбы", True, "из 320 г сырого филе" in text and "из 400 г сырого филе" in text)
    nums = page.eval_on_selector_all(".rc .rc-nums", "ns=>ns.map(n=>n.textContent)")
    check("рецепты: КБЖУ на порцию не изменились", EXPECTED_RECIPES, nums)
    page.close()


# Значения карточек (26.10.2026; омлет 370 → 366 ккал 27.10.2026 после сверки перца и моцареллы с USDA SR Legacy)
EXPECTED_RECIPES = ["23 гбелка352ккал8 / 50жиры / угл., г", "24 гбелка366ккал20 / 22жиры / угл., г", "48 гбелка508ккал11 / 57жиры / угл., г", "40 гбелка401ккал7 / 45жиры / угл., г", "33 гбелка389ккал11 / 41жиры / угл., г", "33 гбелка337ккал15 / 20жиры / угл., г"]


def t_print(ctx, browser):
    long_ex = "Румынская тяга с гантелями на одной ноге с опорой о стену — медленное опускание"
    lifts = []
    for i in range(14):
        ex = f"{long_ex} {i+1}" if i % 3 == 0 else f"Упражнение номер {i+1}"
        for d in ("2026-08-01", "2026-08-15", "2026-09-01", "2026-09-15"):
            lifts.append({"date": d, "ex": ex, "w": 20 + i, "r": 8, "s": 3})
    act = [{"week": f"2026-0{m}-{d:02d}", "steps": s, "min": 60, "days": 2} for (m, d, s) in ((8, 3, 4000), (8, 10, 7000), (8, 17, 9000), (8, 24, 6800), (8, 31, 12000))]
    data_long = {"lifts": lifts, "tests": VALID["tests"] + [{"date": "2026-09-20", "srt": 9, "chair": 16, "bal": 2}], "act": act, "body": VALID["body"] + [{"date": "2026-09-20", "waist": 71, "hips": 97, "weight": 60.5}], "name": "Анна"}
    data_short = {"lifts": LIFTS_A, "tests": [], "act": [{"week": "2026-09-07", "steps": 7000, "min": 60, "days": 2}], "body": [], "name": ""}
    for label, data, body in (("короткий, без замеров", data_short, False), ("длинный, с замерами", data_long, True), ("длинный, без замеров", data_long, False)):
        page = fresh(ctx, "progress.html", {"progress_v1": json.dumps(data, ensure_ascii=False)})
        page.evaluate("window.print=function(){}")
        if body:
            page.check("#rBody")
        page.click("#pdfBtn")
        page.emulate_media(media="print")
        # подпись «7 000 шагов» целиком внутри области SVG
        inside = page.evaluate("""()=>{const t=[...document.querySelectorAll('#report svg text')].find(x=>x.textContent==='7 000 шагов');if(!t)return 'нет подписи';
            const b=t.getBBox(),vb=t.ownerSVGElement.viewBox.baseVal;return b.y>=vb.y&&b.y+b.height<=vb.y+vb.height&&b.x>=vb.x&&b.x+b.width<=vb.x+vb.width}""")
        check(f"печать ({label}): подпись «7 000 шагов» не обрезана", True, inside)
        fn = os.path.join(OUT, f"report-{len(RESULTS)}.pdf")
        page.pdf(path=fn, format="A4", print_background=True)
        txt = subprocess.run(["pdftotext", "-layout", fn, "-"], capture_output=True, text=True).stdout
        pages = int([l for l in subprocess.run(["pdfinfo", fn], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages:")][0].split()[1])
        check(f"печать ({label}): кириллица и заголовок в PDF", True, "Отчёт о прогрессе" in txt)
        check(f"печать ({label}): нет меню и кнопок", True, not any(w in txt for w in ("Знания и инструменты", "Сохранить отчёт в PDF", "Записать неделю", "Приложение на телефон")))
        check(f"печать ({label}): раздел «Замеры» {'есть' if body else 'отсутствует'}", body, "Замеры" in txt.split("Как считали")[0] and "Талия" in txt)
        if label.startswith("длинный"):
            check(f"печать ({label}): многостраничный, длинные названия без обрезки", True, pages >= 2 and "медленное" in txt)
        else:
            check(f"печать ({label}): тоннаж в PDF 0%", True, "0%" in txt)
        print(f"     PDF: {fn}, страниц: {pages}")
        page.close()


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(accept_downloads=True, locale="ru-RU", viewport={"width": 1200, "height": 900})
        t_import(ctx)
        t_tonnage(ctx)
        t_validation(ctx)
        t_timer(ctx)
        t_generators(ctx)
        t_fooddb(ctx)
        t_recipes(ctx)
        t_print(ctx, browser)
        browser.close()
    failed = [r for r in RESULTS if not r[0]]
    print(f"\nИтого: {len(RESULTS) - len(failed)} из {len(RESULTS)} проверок пройдены. PDF и файлы: {OUT}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
