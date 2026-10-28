"""Собирает шапку и меню сайта из одного списка и вставляет во все страницы.
Запуск из корня репозитория: python scripts/build_nav.py
Меню между маркерами <!-- nav:start --> и <!-- nav:end --> (при первом запуске заменяет старую шапку)."""
import glob
import re

START = "https://t.me/Gym_mom1988"
CHANNEL = "https://t.me/alena_gymmom"

ICONS = {
    "me": '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    "train": '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
    "food": '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2.5 5-2.5 7.5S16 14 17 14V21"/>',
    "know": '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>',
    "price": '<path d="M8 3h8l4 5-8 13L4 8z"/><path d="M4 8h16"/>',
}

# Пункт: (адрес, название, пояснение). Подзаголовок внутри группы: ("#", "Название подгруппы", None)
MENU = [
    ("me", "Об Алёне", [
        ("./#about", "Подход", "Тренировки, которые делают жизнь лучше"),
        ("./#creds", "Образование и соревнования", "Дипломы и бронза WRPF"),
        ("./#how", "Как проходит работа", "От «СТАРТ» до первой тренировки"),
        ("./#who", "Кому подойдёт", "И кому формат не подойдёт"),
    ], ("./#about", "Привет, я Алёна", "Тренер и нутрициолог, Санкт-Петербург")),
    ("train", "Тренировки", [
        ("servisy.html#trenirovka", "Тренировка дня", "Общий шаблон примерно на 15–40 минут"),
        ("vozvrat.html", "План возвращения", "Если была пауза: 4 недели и PDF"),
        ("zal.html", "Карта зала", "Что за тренажёр и как его настроить"),
        ("odezhda.html", "Одежда и обувь", "Что надеть и как стирать, чтобы не пахло"),
        ("inventar.html", "Инвентарь для дома", "Что купить, зачем и на что не тратиться"),
        ("gadzhety.html", "Фитнес-гаджеты", "Что измеряют точно и стоит ли переплачивать"),
    ], ("vozvrat.html", "Возвращаетесь после паузы?", "Соберите план на 4 недели за минуту")),
    ("food", "Питание", [
        ("pitanie.html", "Основы питания", "Белок, углеводы, жиры — простым языком"),
        ("golod.html", "Голод и перекусы", "Голод или нет — и сытные перекусы"),
        ("recepty.html", "Рецепты с белком", "Простые блюда из обычных продуктов"),
        ("korzina.html", "Базовая корзина", "Список продуктов с выгрузкой в PDF"),
        ("kalorii.html", "Калории и БЖУ", "Посчитать еду без дневной нормы"),
    ], ("golod.html", "Хочется есть прямо сейчас?", "Проверка за 30 секунд и что съесть")),
    ("know", "Знания и инструменты", [
        ("#", "Почитать", None),
        ("nauka.html", "Научные разборы", "Международные исследования простым языком"),
        ("blizost.html", "Тренировки и близость 18+", "Что говорит наука"),
        ("novosti.html", "Новости", "Из канала и мира науки"),
        ("vopros.html", "Вопросы и предложения", "Предложить тему для разбора"),
        ("#", "Практические инструменты", None),
        ("testy.html", "Тесты за 5 минут", "Сила, баланс, активность"),
        ("progress.html", "Мой прогресс", "Журнал, графики и отчёт в PDF"),
        ("servisy.html#taymer", "Интервальный таймер", "Для домашних тренировок"),
        ("servisy.html#treker", "Трекер привычек", "Шаги, сон, вода, тренировки"),
        ("servisy.html#dnevnik", "Дневник самочувствия", "Энергия и тренировки по дням цикла"),
    ], ("testy.html", "Проверьте себя", "Пять простых тестов без регистрации")),
    ("price", "Занятия и запись", [
        ("./#plans", "Форматы и цены", "Онлайн-сопровождение и мини-группы"),
        ("./#groups", "Расписание групп", "Среда и суббота, в календарь"),
        ("./#quiz", "Подобрать формат", "4 вопроса — и понятно, что подходит"),
        ("trener.html", "Зачем тренер и нутрициолог", "Честно: кому хватит сайта, а кому нет"),
        ("./#faq", "Частые вопросы", "Опыт, дом, техника, питание, оплата"),
        ("./#start", "Контакты", "Telegram для записи и канал"),
    ], (START, "Первый шаг — «СТАРТ»", "Напишите в Telegram, подберу формат")),
]


def ext(href):
    return ' target="_blank" rel="noopener"' if href.startswith("http") else ""


def icon(k):
    return ('<svg class="ico" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + "</svg>")


def build():
    top, mob = [], []
    for i, (k, title, items, promo) in enumerate(MENU):
        links = "".join(
            (f'<span class="dd-sub">{t}</span>' if d is None else
             f'<a class="dd-link" href="{h}"{ext(h)}><b>{t}{" ↗" if h.startswith("http") else ""}</b><span>{d}</span></a>')
            for h, t, d in items)
        ph, pt, pd = promo
        top.append(
            f'<div class="dd" data-group="{k}"><button class="dd-btn" type="button" aria-expanded="false" '
            f'aria-controls="dd-{k}">{title}<i class="chev" aria-hidden="true"></i></button>'
            f'<div class="dd-panel" id="dd-{k}" hidden><div class="dd-grid"><div class="dd-links">{links}</div>'
            f'<a class="dd-promo" href="{ph}"{ext(ph)}>{icon(k)}<b>{pt}</b><span>{pd}</span><i>Перейти →</i></a>'
            f'</div></div></div>')
        mlinks = "".join(
            (f'<span class="mg-sub">{t}</span>' if d is None else
             f'<a href="{h}"{ext(h)}><b>{t}{" ↗" if h.startswith("http") else ""}</b><span>{d}</span></a>')
            for h, t, d in items)
        mob.append(
            f'<details class="mg" data-group="{k}"><summary>{icon(k)}<span>{title}</span>'
            f'<i class="chev" aria-hidden="true"></i></summary><div class="mg-links">{mlinks}</div></details>')
    header = (
        '<!-- nav:start -->\n<a class="skip-link" href="#top">К основному содержимому</a>\n<header class="bar g">\n  <div class="w">\n'
        '    <a class="brand" href="./" aria-label="ALENAFIT — на главную"><img class="brand-mark" src="img/brand/mark-light.svg" alt="" width="41" height="34"><span class="brand-text"><img class="brand-word" src="img/brand/wordmark-light.svg" alt="ALENAFIT" width="108" height="15"><small>сила без перегибов</small></span></a>\n'
        '    <nav class="tnav" aria-label="Разделы">' + "".join(top) + '</nav>\n'
        '    <a class="zal-btn" href="moy-zal.html" aria-label="Мой зал — избранные разделы" title="Мой зал"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linejoin=\"round\"><path d=\"M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z\"/></svg><span>Мой зал</span><i class="zal-n" hidden></i></a>\n'
        '    <button class="inst-btn" type="button" data-pwa aria-label="Установить приложение на телефон" title="Установить приложение"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span>Приложение</span></button>\n'
        '    <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="mnav"><span class="burger" aria-hidden="true"></span>Меню</button>\n'
        f'    <a class="btn btn-main" href="{START}" target="_blank" rel="noopener">СТАРТ</a>\n'
        '  </div>\n</header>\n'
        '<div class="mnav" id="mnav" hidden>\n  <nav class="mnav-in g" aria-label="Меню">\n'
        '    <a class="m-home" href="./">Главная</a>\n    <button type="button" class="m-install" data-pwa><img src="icons/icon-192.png" alt="" width="40" height="40"><span><b>Приложение на телефон</b><small>Иконка на рабочем столе, основные инструменты — без интернета</small></span></button>\n    <div class="m-zal"><a class="m-zal-head" href="moy-zal.html"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linejoin=\"round\"><path d=\"M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z\"/></svg><span><b>Мой зал</b><small>Избранные разделы — всегда под рукой</small></span><i class="zal-n" hidden></i></a><div class="m-zal-links"></div></div>\n    ' + "\n    ".join(mob) + '\n'
        f'    <div class="m-cta"><a class="btn btn-main btn-wide" href="{START}" target="_blank" rel="noopener">Написать «СТАРТ»</a></div>\n'
        '  </nav>\n</div>\n<!-- nav:end -->')
    return header


def slug(h):
    """Стабильный ключ раздела для «Моего зала»: адрес без ./ и .html."""
    h = h[2:] if h.startswith("./") else h
    page, _, anchor = h.partition("#")
    page = page.replace(".html", "") or "index"
    return page + ("#" + anchor if anchor else "")


def write_sections():
    """js/sections.js — единый список разделов меню (источник для «Моего зала»)."""
    import json
    out = []
    for k, title, items, promo in MENU:
        for h, t, d in items:
            if d is None or h.startswith("http"):
                continue
            out.append({"id": slug(h), "h": h, "t": t, "d": d, "g": title})
    js = ("/* Собирается автоматически: scripts/build_nav.py. Не править вручную. */\n"
          "window.ALENA_SECTIONS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open("js/sections.js", "w", encoding="utf-8").write(js)
    print("sections", len(out))


def main():
    write_sections()
    nav = build()
    old = re.compile(r'<header class="bar g">.*?</header>\s*<div class="mnav" id="mnav" hidden>.*?</nav>\s*</div>', re.S)
    marked = re.compile(r'<!-- nav:start -->.*?<!-- nav:end -->', re.S)
    for fn in sorted(glob.glob("*.html")):
        s = open(fn, encoding="utf-8").read()
        if marked.search(s):
            s2 = marked.sub(lambda m: nav, s, count=1)
        elif old.search(s):
            s2 = old.sub(lambda m: nav, s, count=1)
        else:
            print("skip", fn)
            continue
        if s2 != s:
            open(fn, "w", encoding="utf-8").write(s2)
            print("nav", fn)


if __name__ == "__main__":
    main()
