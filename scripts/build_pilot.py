"""Собирает pilot.html из index.html по замечаниям к главной (31.10.2026).
Анимации (home-motion, data-pilot-motion, card-reveal, final-invite) не трогаем."""
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
src = (root / "index.html").read_text(encoding="utf-8")
h = src

def must(old, new, count=1):
    global h
    n = h.count(old)
    if n < count:
        raise SystemExit(f"не найдено ({n}): {old[:80]}")
    h = h.replace(old, new)

TG = "https://t.me/Gym_mom1988"
TG_START = "https://t.me/Gym_mom1988?text=%D0%A1%D0%A2%D0%90%D0%A0%D0%A2"  # ?text=СТАРТ

# --- служебное: пилот не индексируется, своя стилевая надстройка
must('<meta name="viewport"', '<meta name="robots" content="noindex,nofollow">\n<meta name="viewport"')
must('<link rel="canonical" href="https://alenafit.com/">', '<link rel="canonical" href="https://alenafit.com/">\n<link rel="stylesheet" href="css/pilot-review.css?v=1">')
must('<title>', '<title>[Пилот] ')

# --- 1. дескриптор под логотипом
must('<small>Сила без перегибов</small></span></a>', '<small>Тренировки и питание</small></span></a>')

# --- 2. кнопки: «Написать в Telegram» + подсказка про СТАРТ, слово подставляется в чат
h = h.replace(f'href="{TG}"', f'href="{TG_START}"')
for old in ['>Написать «СТАРТ»<', '>Записаться — «СТАРТ»<']:
    h = h.replace(old, '>Написать в Telegram<')
must('<p class="reassure">', '<p class="cta-hint">Первым сообщением — слово «СТАРТ», оно подставится само.</p>\n      <p class="reassure">')

# --- 3. «тренирую других»
must('<span>тренирую других</span>', '<span>работаю с клиентами</span>')

# --- 4. строка доверия на первом экране (квалификация из README, подтверждена документами)
must('<div class="proof" aria-label="Коротко обо мне">',
     '<p class="trust-line"><span>КОРУС · инструктор групповых программ</span><span>Спортивный нутрициолог</span><span>3-е место WRPF · тяга 105 кг</span></p>\n      <div class="proof" aria-label="Коротко обо мне">')

# --- 7. подводка квиза
must('Четыре вопроса — и подскажу, с чего начать. Ответы никуда не отправляются.',
     'Ответьте на 4 вопроса — и я подскажу, с чего начать. Ответы никуда не отправляются, всё остаётся у вас в браузере.')

# --- 8. «Зачем тренер»: кнопка вместо ссылки
must('<i>Читать и пройти тест →</i>', '<span class="btn btn-line pilot-btn">Читать и пройти тест</span>')

# --- 10. «Мой зал» → «Избранное» (только подписи на этой странице)
h = h.replace('<span>Мой зал</span>', '<span>Избранное</span>')
h = h.replace('<b>Мой зал</b><small>Избранные разделы — всегда под рукой</small>',
              '<b>Избранное</b><small>Разделы, которые вы отметили звёздочкой</small>')
h = h.replace('aria-label="Мой зал — избранные разделы" title="Мой зал"',
              'aria-label="Избранное — сохранённые разделы" title="Избранное: отмечайте разделы звёздочкой"')

# --- блоки: вырезаем и собираем в новом порядке
def cut(sec_id):
    global h
    m = re.search(r'[ \t]*<section[^>]*\bid="%s"[^>]*>.*?</section>\n?' % re.escape(sec_id), h, re.S)
    if not m:
        raise SystemExit("нет секции " + sec_id)
    h = h[:m.start()] + h[m.end():]
    return m.group(0)

blocks = {k: cut(k) for k in ["manifest", "who", "limits", "about", "how", "coaching-demo",
                              "plans", "quiz", "zachem", "tools", "research", "news", "faq"]}

# демо-переписка: явная метка, что сюда идут реальные скриншоты
blocks["coaching-demo"] = blocks["coaching-demo"].replace(
    '<span class="demo-label">Демонстрационный пример · не переписка клиента</span>',
    '<span class="demo-label">Демонстрационный пример · сюда встанут скриншоты переписок [нужно от Алёны: 2–3 скриншота с письменным согласием клиентов, имена и аватарки скрыты]</span>')

# исследования и новости — с главной убираем, оставляем одну строку
science = '''  <section class="g pilot-science" id="research">
    <div class="w">
      <p><b>Подход опирается на исследования.</b> Разборы — на отдельной странице и в канале.</p>
      <div class="row-btns"><a class="btn btn-line" href="nauka.html">Научные разборы</a><a class="btn btn-line" href="https://t.me/alena_gymmom" target="_blank" rel="noopener">Канал в Telegram</a></div>
    </div>
  </section>
'''
order = ["who", "how", "coaching-demo", "plans", "limits", "quiz", "about", "manifest",
         "zachem", "tools", "faq"]
body = "".join(blocks[k] for k in order[:-1]) + science + blocks["faq"]

# вставляем после первого экрана
hero_end = h.index("</section>", h.index('<section class="hero g">')) + len("</section>\n")
h = h[:hero_end] + body + h[hero_end:]

# --- инструменты: плашки с иконками, без дублирующей навигации
icons = {
    "tools-train": '<svg class="tg-ico" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
    "tools-food": '<svg class="tg-ico" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2.5 5-2.5 7.5S16 14 17 14V21"/></svg>',
    "tools-progress": '<svg class="tg-ico" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M6 16l4-5 3 3 5-7"/></svg>',
}
for gid, ico in icons.items():
    h = re.sub(r'(<div class="tool-group" id="%s"><h3>)' % gid, r'\1' + ico.replace('\\', '\\\\'), h)

# --- 12. подвал = те же 5 разделов, что в меню
footer = f'''<footer class="g pilot-foot"><div class="w">
  <div class="pf-top"><img class="foot-logo" src="img/brand/logo-light.svg" alt="ALENAFIT" width="150" height="96" loading="lazy"><p>Алёна Вислова · тренер и нутрициолог · Санкт-Петербург</p><a class="btn btn-main" href="{TG_START}" target="_blank" rel="noopener">Написать в Telegram</a></div>
  <nav class="pf-cols" aria-label="Разделы сайта">
    <div><b>Об Алёне</b><a href="#about">Подход</a><a href="#creds">Образование и соревнования</a><a href="#how">Как проходит работа</a><a href="#who">Кому подойдёт</a></div>
    <div><b>Тренировки</b><a href="servisy.html#trenirovka">Тренировка дня</a><a href="vozvrat.html">План возвращения</a><a href="zal.html">Карта зала</a><a href="odezhda.html">Одежда и обувь</a><a href="inventar.html">Инвентарь для дома</a><a href="gadzhety.html">Фитнес-гаджеты</a></div>
    <div><b>Питание</b><a href="pitanie.html">Основы питания</a><a href="golod.html">Голод и перекусы</a><a href="recepty.html">Рецепты с белком</a><a href="korzina.html">Базовая корзина</a><a href="kalorii.html">Калории и БЖУ</a></div>
    <div><b>Знания и инструменты</b><a href="nauka.html">Научные разборы</a><a href="novosti.html">Новости</a><a href="testy.html">Тесты за 5 минут</a><a href="progress.html">Мой прогресс</a><a href="servisy.html#taymer">Таймер и трекер</a><a href="vopros.html">Вопросы и предложения</a></div>
    <div><b>Занятия и запись</b><a href="#plans">Форматы и цены</a><a href="#groups">Расписание групп</a><a href="#quiz">Подобрать формат</a><a href="trener.html">Зачем тренер</a><a href="#faq">Частые вопросы</a><a href="#start">Контакты</a></div>
  </nav>
  <div class="pf-bottom"><span>Самозанятая. Не является медицинской услугой.</span><span><a href="https://t.me/alena_gymmom" target="_blank" rel="noopener">Канал</a> · <a href="moy-zal.html">Избранное</a> · <button type="button" class="foot-pwa" data-pwa>Установить приложение</button></span></div>
</div></footer>'''
h = re.sub(r'<footer class="g">.*?</footer>', lambda m: footer, h, count=1, flags=re.S)

# --- скрипт квиза тоже ведёт в Telegram с подставленным словом
h = h.replace("var TG='https://t.me/Gym_mom1988';", "var TG='%s';" % TG_START)

# --- метка пилота
must('<main id="top" tabindex="-1">',
     '<div class="pilot-flag" role="note">Пилот главной · не опубликован · <a href="./">текущая версия</a></div>\n<main id="top" tabindex="-1">')


# --- три плашки инструментов в одной сетке
i=h.index('<div class="tool-group" id="tools-train">'); j=h.index('<div class="row-btns"><a class="btn btn-line" href="servisy.html">')
h=h[:i]+'<div class="tools-row">'+h[i:j].rstrip()+'</div>\n      '+h[j:]

# --- «Мой зал» → «Избранное» в элементах, которые создают общие скрипты
h=h.replace('</body>', """<script>/* пилот: подписи «Мой зал» из nav.js и myzal.js */
document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){
document.querySelectorAll('.zal-dock span,[data-myzal] span,.zal-add span').forEach(function(e){e.textContent=e.textContent.replace('В Моём зале','В избранном').replace('В Мой зал','В избранное').replace('Мой зал','Избранное')})},300)});
</script>
</body>""",1)

(root / "pilot.html").write_text(h, encoding="utf-8")
print("ok", len(h))
