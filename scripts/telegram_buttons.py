"""Кнопки и ссылки на Telegram без кодового слова «СТАРТ» (01.11.2026).
Запуск из корня: python3 scripts/telegram_buttons.py — повторный запуск ничего не меняет.
- кнопки «Написать «СТАРТ»», «СТАРТ», «Записаться — «СТАРТ»» → значок Telegram + «Написать в Telegram» (в шапке — «Написать»)
- в тексте «напишите «СТАРТ»» → «напишите мне в Telegram», «От «СТАРТ» до…» → «От первого сообщения до…»
- в Telegram подставляется приветствие, по нему считаем заявки с сайта (как на главной)
"""
import glob, re, pathlib

TG = 'https://t.me/Gym_mom1988'
HELLO = TG + '?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%2C%20%D0%90%D0%BB%D1%91%D0%BD%D0%B0%21%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BD%D0%B0%D1%87%D0%B0%D1%82%D1%8C%20%D1%82%D1%80%D0%B5%D0%BD%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D1%82%D1%8C%D1%81%D1%8F'
START_Q = TG + '?text=%D0%A1%D0%A2%D0%90%D0%A0%D0%A2'
ICON = ('<svg class="tg-ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path fill="currentColor" d="M21.4 3.6 2.9 10.7c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5zM8.6 13.4l9.6-6.1c.5-.3.9-.1.5.2l-7.9 7.2-.3 3.6z"/></svg>')

BUTTON_TEXTS = ['Написать «СТАРТ»', 'Записаться — «СТАРТ»', '«СТАРТ»', 'СТАРТ', 'Написать в Telegram']
TEXT = [
    ('Хочу программу с учётом этого — «СТАРТ» →', 'Хочу программу с учётом этого — написать в Telegram'),
    ('Напишите «СТАРТ» в Telegram', 'Напишите мне в Telegram'),
    ('напишите «СТАРТ» в Telegram', 'напишите мне в Telegram'),
    ('Пришлите PDF-отчёт и напишите «СТАРТ»', 'Пришлите PDF-отчёт мне в Telegram'),
    ('Напишите «СТАРТ».', 'Напишите мне в Telegram.'),
    ('Напишите «СТАРТ»', 'Напишите мне в Telegram'),
    ('напишите «СТАРТ»', 'напишите мне в Telegram'),
    ('От «СТАРТ» до первой тренировки', 'От первого сообщения до тренировки'),
    ('Первый шаг — «СТАРТ»', 'Первый шаг'),
    ('бронируется через «СТАРТ» в Telegram', 'бронируется сообщением в Telegram'),
    ('Пишете «СТАРТ» в Telegram', 'Пишете мне в Telegram'),
    ("const text='СТАРТ\\nИмя:", "const text='Здравствуйте, Алёна!\\nИмя:"),
]

def fix_buttons(s):
    # кнопки (class="btn …") на Telegram: значок + понятная подпись; «СТАРТ» заменяется
    def repl(m):
        attrs, inner = m.group(1), m.group(2)
        if 'tg-ico' in inner or 'class="btn' not in attrs:
            return m.group(0)
        text = re.sub(r'<[^>]+>', '', inner).replace('↗', '').strip()
        tail = ' <span aria-hidden="true">↗</span>' if '↗' in inner else ''
        if text in ('Написать «СТАРТ»', 'Записаться — «СТАРТ»', '«СТАРТ»'):
            text = 'Написать в Telegram'
        elif text in ('СТАРТ', 'Написать'):
            text = 'Написать'
        attrs = attrs.replace('href="' + TG + '"', 'href="' + HELLO + '"').replace('href="' + START_Q + '"', 'href="' + HELLO + '"')
        return '<a ' + attrs + '>' + ICON + '<span>' + text + '</span>' + tail + '</a>'
    s = re.sub(r'<a ((?:(?!>).)*href="https://t\.me/Gym_mom1988[^"]*"(?:(?!>).)*)>((?:(?!</a>).)*)</a>', repl, s)
    # кнопка в подсказке квиза на главной собирается скриптом
    s = s.replace("rel=\"noopener\">Написать «СТАРТ»</a><p class=\"small\">Это подсказка", "rel=\"noopener\">" + ICON + "<span>Написать в Telegram</span></a><p class=\"small\">Это подсказка")
    s = s.replace("rel=\"noopener\">Написать в Telegram</a><p class=\"small\">Это подсказка", "rel=\"noopener\">" + ICON + "<span>Написать в Telegram</span></a><p class=\"small\">Это подсказка")
    return s

def fix_text(s):
    for a, b in TEXT:
        s = s.replace(a, b)
    return s

files = sorted(glob.glob('*.html')) + ['scripts/index_source.html', 'scripts/build_nav.py'] + sorted(glob.glob('js/*.js'))
changed = []
for f in files:
    p = pathlib.Path(f)
    s = p.read_text(encoding='utf-8'); o = s
    if f.endswith('.html'):
        s = fix_buttons(s)
    s = fix_text(s)
    if f == 'scripts/build_nav.py':
        s = s.replace('target="_blank" rel="noopener">СТАРТ</a>', 'target="_blank" rel="noopener">' + ICON + '<span>Написать</span></a>')
        s = s.replace('target="_blank" rel="noopener">Написать «СТАРТ»</a>', 'target="_blank" rel="noopener">' + ICON + '<span>Написать в Telegram</span></a>')
    if s != o:
        p.write_text(s, encoding='utf-8'); changed.append(f)
print(len(changed), 'файлов изменено')
left = [(f, l.strip()[:120]) for f in files for l in pathlib.Path(f).read_text(encoding='utf-8').splitlines() if 'СТАРТ' in l and 'START' not in l]
print('осталось «СТАРТ»:', left[:10])
