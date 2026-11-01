"""Run on the assistant server: sudo python3 update_afita_contact.py
Убирает из чата Афиты кодовое слово «СТАРТ» и задаёт новый способ записи.
Ключи и пароли не читает; доступ, лимиты и настройки API не трогает.
Перед изменением делает копии файлов (*.before-nostart-ДАТА). Повторный запуск безопасен."""
from pathlib import Path
from datetime import datetime
import ast, re, shutil, subprocess, sys

page = Path('/var/www/alenafit-assistant/index.html')
backend = Path('/opt/alenafit-assistant/server.py')
MARK = '# AFITA_CONTACT_V2'
RULE = ('Кодовое слово «СТАРТ» больше не используется: никогда не предлагай его писать. '
        'Чтобы записаться к Алёне или задать ей вопрос, человек нажимает кнопку «Написать в Telegram» на сайте '
        'или пишет @Gym_mom1988 своими словами: что интересует (онлайн-сопровождение, мини-группа или консультация) и какая цель. '
        'Не обещай свободные места и время — их Алёна подтверждает лично.')


def clean(text):
    """Переписывает фразы со «СТАРТ» в обычный призыв написать в Telegram."""
    q = r'[«"\']?(?:СТАРТ|START|Старт)[»"\']?'
    rules = [
        # «напишите «СТАРТ» в Telegram (Алёне …)» → «напишите в Telegram (Алёне …)»
        (r'(напи\w+|отправ\w+)\s+(?:кодовое\s+слово\s+|слово\s+)?' + q + r'\s+(?=(?:в\s+Telegram|в\s+телеграм|по\s+контакту|Алён))', r'\1 '),
        # «написать «СТАРТ»» в конце фразы → «написать в Telegram»
        (r'(напи\w+|отправ\w+)\s+(?:кодовое\s+слово\s+|слово\s+)?' + q, r'\1 в Telegram'),
    ]
    keep = text.count(RULE)
    text = text.replace(RULE, '\x00RULE\x00')
    count = 0
    for pattern, repl in rules:
        text, n = re.subn(pattern, repl, text, flags=re.I)
        count += n
    # оставшиеся предложения со «СТАРТ» (например, «Кодовое слово «СТАРТ» обязательно.») убираются целиком
    text, n = re.subn(r'(?<=[.!?:"\'>])(\s?)[^.!?\n"\'<>\x00\s][^.!?\n"\'<>\x00]*' + q + r'[^.!?\n"\'<>\x00]*[.!?](\s?)', lambda m: m.group(1) if m.group(2) else '', text)
    count += n
    text = text.replace('\x00RULE\x00', RULE)
    assert text.count(RULE) == keep
    return text, count


html_src, code_src = page.read_text(), backend.read_text()
html, n_html = clean(html_src)
code, n_code = clean(code_src)

if MARK not in code:
    marker = '        request = urllib.request.Request('
    if code.count(marker) != 1:
        sys.exit('Сервер не похож на ожидаемый: файлы не изменены')
    code = code.replace(marker, '        ' + MARK + '\n        payload["instructions"] += ' + repr('\n' + RULE) + '\n' + marker, 1)
    added = True
else:
    added = False

ast.parse(code)
left = [p for p, t in ((page, html), (backend, code)) if re.search(r'«СТАРТ»|"СТАРТ"', t.replace(RULE, ''))]

if html == html_src and code == code_src:
    print('Изменений не нужно: «СТАРТ» уже убран.')
    sys.exit(0)

stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
for p in (page, backend):
    shutil.copy2(p, p.with_name(p.name + '.before-nostart-' + stamp))
page.write_text(html)
backend.write_text(code)
subprocess.run(['docker', 'restart', 'alenafit-assistant-test'], check=True)

print(f'Готово. Исправлено фраз: страница чата — {n_html}, настройки ответа — {n_code}.'
      + (' Добавлено правило записи без «СТАРТ».' if added else ''))
if left:
    print('Внимание: «СТАРТ» ещё встречается в ' + ', '.join(str(p) for p in left) + ' — пришлите эту строку, поправлю.')
print('Откат: скопируйте файлы *.before-nostart-' + stamp + ' обратно и перезапустите контейнер alenafit-assistant-test.')
