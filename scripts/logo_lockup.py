"""Новый логотип в шапке и подвале (01.11.2026): знак + ALENAFIT + «сила без перегибов» | ТРЕНИРОВКИ И ПИТАНИЕ.
Собран из фирменных знака и надписи (векторы) и текста шрифтами сайта — чёткий на любом экране.
Запуск из корня: python3 scripts/logo_lockup.py (повторный запуск ничего не меняет)."""
import glob, re, pathlib

TAG = '<small class="brand-tag">сила без перегибов</small>'
DESC = '<span class="brand-desc">Тренировки<br>и питание</span>'

def header(s):
    # подпись под надписью → «сила без перегибов»; справа через янтарную черту — направление
    s = re.sub(r'(<img class="brand-word"[^>]*>)<small>[^<]*</small></span></a>', r'\1' + TAG + '</span>' + DESC + '</a>', s)
    return s

FOOT = ('<span class="foot-lockup" role="img" aria-label="ALENAFIT — сила без перегибов. Тренировки и питание">'
        '<img class="fl-mark" src="img/brand/mark-light.svg" alt="" width="56" height="46" loading="lazy">'
        '<span class="fl-text"><img class="fl-word" src="img/brand/wordmark-light.svg" alt="" width="150" height="21" loading="lazy"><small>сила без перегибов</small></span>'
        '<span class="fl-desc">Тренировки<br>и питание</span></span>')

def footer(s):
    return re.sub(r'<img class="foot-logo"[^>]*>', FOOT, s)

files = sorted(glob.glob('*.html')) + ['scripts/index_source.html']
n = 0
for f in files:
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8'); o = s
    s = footer(header(s))
    if s != o: p.write_text(s, encoding='utf-8'); n += 1
# исходник шапки и пилотной сборки
for f, pairs in {
    'scripts/build_nav.py': [],
    'scripts/build_pilot.py': [("must('<small>Сила без перегибов</small></span></a>', '<small>Тренировки и питание</small></span></a>')", "h = h  # подпись в шапке задаёт scripts/logo_lockup.py")],
}.items():
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8'); o = s
    for a, b in pairs: s = s.replace(a, b)
    s = re.sub(r'(<img class="brand-word"[^>]*>)<small>[^<]*</small></span></a>', r'\1' + TAG + '</span>' + DESC + '</a>', s)
    s = re.sub(r'<img class="foot-logo"[^>]*>', FOOT, s)
    if s != o: p.write_text(s, encoding='utf-8'); n += 1
print(n, 'файлов изменено')
