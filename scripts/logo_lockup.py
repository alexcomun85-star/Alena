"""Логотип в шапке и подвале (01.11.2026): знак + ALENAFIT + «сила без перегибов» | ТРЕНИРОВКИ И ПИТАНИЕ.
Надпись — один SVG с фиксированными пропорциями (viewBox): на любом экране масштабируется целиком,
ничего не скрывается и не переносится. Ширина строк зафиксирована textLength — шрифт не «распирает» блок.
Знак в шапке остаётся отдельным (на главной он анимирован). Запуск из корня: python3 scripts/logo_lockup.py"""
import glob, re, pathlib

TEXT = ('<image href="img/brand/wordmark-light.svg" x="0" y="22" width="313" height="45"/>'
        '<text class="bl-tag" x="0" y="122" textLength="313" lengthAdjust="spacingAndGlyphs" fill="#a9c0b7">сила без перегибов</text>'
        '<rect x="375" y="8" width="4" height="128" rx="2" fill="#f0a92b"/>'
        '<text class="bl-desc" x="397" y="64" textLength="324" lengthAdjust="spacingAndGlyphs" fill="#eef4f1">ТРЕНИРОВКИ</text>'
        '<text class="bl-desc" x="397" y="117" textLength="274" lengthAdjust="spacingAndGlyphs" fill="#eef4f1">И ПИТАНИЕ</text>')
LOCK = '<svg class="brand-lock" viewBox="0 0 725 140" width="207" height="40" aria-hidden="true" focusable="false">' + TEXT + '</svg>'
FOOT = ('<svg class="foot-lock" viewBox="0 0 900 140" width="420" height="65" role="img" aria-label="ALENAFIT — сила без перегибов. Тренировки и питание">'
        '<image href="img/brand/mark-light.svg" x="0" y="11" width="143" height="118"/><g transform="translate(175 0)">' + TEXT + '</g></svg>')

def apply(s):
    s = re.sub(r'<span class="brand-text">.*?</span><span class="brand-desc">.*?</span>', LOCK, s, flags=re.S)
    s = re.sub(r'<span class="foot-lockup".*?и питание</span></span>', FOOT, s, flags=re.S)
    s = re.sub(r'<svg class="brand-lock".*?</svg>', LOCK, s, flags=re.S)   # повторный запуск обновляет
    s = re.sub(r'<svg class="foot-lock".*?</g></svg>', FOOT, s, flags=re.S)
    return s

n = 0
for f in sorted(glob.glob('*.html')) + ['scripts/index_source.html', 'scripts/build_nav.py', 'scripts/build_pilot.py']:
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8'); o = s
    s = apply(s)
    if s != o: p.write_text(s, encoding='utf-8'); n += 1
print(n, 'файлов изменено')
