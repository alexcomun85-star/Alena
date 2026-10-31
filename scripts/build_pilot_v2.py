"""Дизайн-слой пилота (v2). Запуск после build_pilot.py: python3 scripts/build_pilot_v2.py .
Анимации сайта не трогает: график нагрузки, появление карточек, финальный блок остаются как есть."""
import re, sys, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
p = root / "pilot.html"
h = p.read_text(encoding="utf-8")

def must(old, new):
    global h
    if old not in h:
        raise SystemExit("не найдено: " + old[:80])
    h = h.replace(old, new, 1)

must('<body class="home-motion design-pilot editorial-refine">',
     '<body class="home-motion design-pilot editorial-refine pilot-v2">')

# --- первый экран: фото на всю ширину, заголовок поверх, без дублирующей подписи
m = re.search(r'<figcaption class="hero-brand-copy">.*?</figcaption>\s*', h, re.S)
h = h[:m.start()] + h[m.end():]
m = re.search(r'\s*<span class="tag">Онлайн и мини-группы в СПб</span>\s*<h1>.*?</h1>', h, re.S)
over = '<div class="hero-over">' + m.group(0).strip() + '</div>\n      '
h = h[:m.start()] + h[m.end():]
i = h.index('</figure>', h.index('<figure class="hero-photo">')) + len('</figure>')
h = h[:i] + '\n      ' + over.strip() + h[i:]

# --- шаги «Как начинаем работу»: номер шага в кружке (это реальная последовательность)
old = re.findall(r'<span class="pl"><i style="[^"]*"></i></span>', h)
if len(old) != 4:
    raise SystemExit("ожидалось 4 шага, найдено %d" % len(old))
for n, o in enumerate(old, 1):
    h = h.replace(o, f'<span class="pl" aria-hidden="true">{n}</span>', 1)

# --- пример поддержки: телефон с перепиской
DEMO = (root / "scripts" / "pilot_demo.html").read_text(encoding="utf-8")
h, n = re.subn(r'<section class="g coaching-demo" id="coaching-demo".*?</section>', lambda m: DEMO.strip(), h, count=1, flags=re.S)
if not n:
    raise SystemExit("нет блока coaching-demo")

# --- об Алёне: крупная цифра
must('<div class="creds" id="creds">',
     '<div class="about-stat"><b>105</b><span>кг в становой тяге<br>3-е место WRPF, Санкт-Петербург</span></div>\n          <div class="creds" id="creds">')

# --- переписка в телефоне: сообщения приходят по одному, лента уезжает вверх
must('</body>', '<script src="js/pilot-phone.js?v=2" defer></script>\n</body>')

# --- лента со свайпом на телефоне: класс swipe + подсказка
h = h.replace('<div class="who">', '<div class="who pswipe">', 1)
h = h.replace('<div class="tools-row">', '<div class="tools-row pswipe">', 1)
i = h.index('</div>', h.index('<div class="who pswipe">'))
# подсказку ставим после ленты «для кого»: ищем конец блока по закрывающему тегу статьи
j = h.index('</article>\n      </div>', h.index('<div class="who pswipe">')) + len('</article>\n      </div>')
h = h[:j] + '\n      <p class="swipe-hint m-only">Листайте</p>' + h[j:]
k = h.index('<div class="row-btns"><a class="btn btn-line" href="servisy.html">')
h = h[:k] + '<p class="swipe-hint m-only">Листайте</p>\n      ' + h[k:]

p.write_text(h, encoding="utf-8")
print("v2 ok", len(h))
