"""Собирает шапку и меню сайта из одного списка и вставляет во все страницы.
Запуск из корня репозитория: python scripts/build_nav.py
Меню между маркерами <!-- nav:start --> и <!-- nav:end --> (при первом запуске заменяет старую шапку)."""
import glob
import re

START = "https://t.me/Gym_mom1988"
CHANNEL = "https://t.me/alena_gymmom"

ICONS = {
    "train": '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
    "food": '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2.5 5-2.5 7.5S16 14 17 14V21"/>',
    "know": '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>',
    "price": '<path d="M8 3h8l4 5-8 13L4 8z"/><path d="M4 8h16"/>',
}

MENU = [
    ("train", "Тренировки", [
        ("servisy.html#trenirovka", "Тренировка дня", "Готовая тренировка на 15–40 минут"),
        ("vozvrat.html", "План возвращения", "Если была пауза: 4 недели и PDF"),
        ("zal.html", "Карта зала", "Что за тренажёр и как его настроить"),
        ("progress.html", "Мой прогресс", "Журнал, графики и отчёт в PDF"),
        ("servisy.html", "Все инструменты", "Таймер, трекер, дневник по циклу"),
    ], ("vozvrat.html", "Возвращаетесь после паузы?", "Соберите план на 4 недели за минуту")),
    ("food", "Питание", [
        ("pitanie.html", "Что, зачем и почему", "Белок, углеводы, жиры — простым языком"),
        ("golod.html", "Когда очень хочется есть", "Голод или нет — и сытные перекусы"),
        ("recepty.html", "Рецепты с белком", "Простые блюда из обычных продуктов"),
        ("korzina.html", "Базовая корзина", "Список продуктов с выгрузкой в PDF"),
        ("kalorii.html", "Калории и БЖУ", "Посчитать еду без дневной нормы"),
    ], ("golod.html", "Хочется есть прямо сейчас?", "Проверка за 30 секунд и что съесть")),
    ("know", "Знания", [
        ("nauka.html", "Наука простым языком", "Разборы международных исследований"),
        ("testy.html", "Тесты за 5 минут", "Сила, баланс, активность"),
        ("blizost.html", "Тренировки и близость 18+", "Что говорит наука"),
        ("novosti.html", "Новости", "Из канала и мира науки"),
        ("vopros.html", "Спросить анонимно", "Предложить тему для разбора"),
    ], ("testy.html", "Проверьте себя", "Пять простых тестов без регистрации")),
    ("price", "Цены и запись", [
        ("./#plans", "Форматы и цены", "Онлайн-сопровождение и мини-группы"),
        ("./#quiz", "Подобрать формат", "3 вопроса — и понятно, что подходит"),
        ("./#groups", "Расписание групп", "Среда и суббота, в календарь"),
        ("./#faq", "Частые вопросы", "Как проходит работа, оплата, отмена"),
        (CHANNEL, "Канал в Telegram", "Посты, разборы и ответы"),
    ], (START, "Первый шаг — «СТАРТ»", "Напишите в Telegram, подберу формат")),
]


def ext(href):
    return ' target="_blank" rel="noopener"' if href.startswith("http") else ""


def icon(k):
    return ('<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + "</svg>")


def build():
    top, mob = [], []
    for i, (k, title, items, promo) in enumerate(MENU):
        links = "".join(
            f'<a class="dd-link" href="{h}"{ext(h)}><b>{t}{" ↗" if h.startswith("http") else ""}</b><span>{d}</span></a>'
            for h, t, d in items)
        ph, pt, pd = promo
        top.append(
            f'<div class="dd" data-group="{k}"><button class="dd-btn" type="button" aria-expanded="false" '
            f'aria-controls="dd-{k}">{title}<i class="chev" aria-hidden="true"></i></button>'
            f'<div class="dd-panel" id="dd-{k}" hidden><div class="dd-grid">{links}'
            f'<a class="dd-promo" href="{ph}"{ext(ph)}>{icon(k)}<b>{pt}</b><span>{pd}</span><i>Перейти →</i></a>'
            f'</div></div></div>')
        mlinks = "".join(
            f'<a href="{h}"{ext(h)}><b>{t}{" ↗" if h.startswith("http") else ""}</b><span>{d}</span></a>'
            for h, t, d in items)
        mob.append(
            f'<details class="mg" data-group="{k}"><summary>{icon(k)}<span>{title}</span>'
            f'<i class="chev" aria-hidden="true"></i></summary><div class="mg-links">{mlinks}</div></details>')
    header = (
        '<!-- nav:start -->\n<header class="bar g">\n  <div class="w">\n'
        '    <a class="brand" href="./" aria-label="ALENAFIT — на главную"><img class="brand-mark" src="img/brand/mark-light.svg" alt="" width="41" height="34"><span class="brand-text"><img class="brand-word" src="img/brand/wordmark-light.svg" alt="ALENAFIT" width="108" height="15"><small>сила без перегибов</small></span></a>\n'
        '    <nav class="tnav" aria-label="Разделы">' + "".join(top) + '</nav>\n'
        '    <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="mnav"><span class="burger" aria-hidden="true"></span>Меню</button>\n'
        f'    <a class="btn btn-main" href="{START}" target="_blank" rel="noopener">СТАРТ</a>\n'
        '  </div>\n</header>\n'
        '<div class="mnav" id="mnav" hidden>\n  <nav class="mnav-in g" aria-label="Меню">\n'
        '    <a class="m-home" href="./">Главная</a>\n    ' + "\n    ".join(mob) + '\n'
        f'    <div class="m-cta"><a class="btn btn-main btn-wide" href="{START}" target="_blank" rel="noopener">Написать «СТАРТ»</a></div>\n'
        '  </nav>\n</div>\n<!-- nav:end -->')
    return header


def main():
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
