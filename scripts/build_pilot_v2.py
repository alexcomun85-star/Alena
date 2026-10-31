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
i = h.index('</figure>', h.index('<figure class="hero-photo">'))
h = h[:i] + over + h[i:]

# --- «По блину за раз»: блины с маркировкой веса, растут от шага к шагу
def plate(kg, r, last=False):
    fill = '#f0a92b' if last else '#2c6e5f'
    ink = '#132823' if last else '#eef4f1'
    fs = 11 if len(kg) > 2 else 13
    return ('<span class="pl"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">'
            f'<circle cx="32" cy="32" r="{r}" fill="{fill}"/>'
            f'<circle cx="32" cy="32" r="{r-3.5}" fill="none" stroke="{ink}" stroke-opacity=".35" stroke-width="1.2"/>'
            f'<text x="32" y="{32 + fs*0.15:.1f}" text-anchor="middle" font-size="{fs}" font-weight="800" fill="{ink}">{kg}</text>'
            f'<text x="32" y="{32 + fs*0.15 + 10:.1f}" text-anchor="middle" font-size="7.5" font-weight="600" fill="{ink}" fill-opacity=".7">КГ</text></svg></span>')

plates = [plate('1,25', 23), plate('2,5', 26), plate('5', 29), plate('10', 32, True)]
old = re.findall(r'<span class="pl"><i style="[^"]*"></i></span>', h)
if len(old) != 4:
    raise SystemExit("ожидалось 4 шага, найдено %d" % len(old))
for o, n in zip(old, plates):
    h = h.replace(o, n, 1)

# --- пример поддержки: телефон с перепиской
DEMO = (root / "scripts" / "pilot_demo.html").read_text(encoding="utf-8")
h, n = re.subn(r'<section class="g coaching-demo" id="coaching-demo".*?</section>', lambda m: DEMO.strip(), h, count=1, flags=re.S)
if not n:
    raise SystemExit("нет блока coaching-demo")

# --- об Алёне: крупная цифра
must('<div class="creds" id="creds">',
     '<div class="about-stat"><b>105</b><span>кг в становой тяге<br>3-е место WRPF, Санкт-Петербург</span></div>\n          <div class="creds" id="creds">')

# --- появление сообщений в телефоне при прокрутке (без JS — всё видно сразу)
must('</body>', """<script>(function(){var c=document.querySelector('[data-chat]');
if(!c||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
new IntersectionObserver(function(e,o){if(e[0].isIntersecting){c.classList.add('chat-anim');o.disconnect()}},{threshold:.35}).observe(c)})();</script>
</body>""")

p.write_text(h, encoding="utf-8")
print("v2 ok", len(h))
