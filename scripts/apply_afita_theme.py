#!/usr/bin/env python3
"""Apply only a scoped visual theme to the existing Afita HTML; no backend changes."""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import os
from pathlib import Path
import re
import shutil
import tempfile
import urllib.request

MARKER = 'afita-site-theme-v1'
CSS = '''
:root{color-scheme:dark;--af-bg:#0d1e1a;--af-surface:#142e27;--af-text:#e8f0eb;--af-muted:#afc4b9;--af-line:#304b40;--af-amber:#f0a92b}
html,body{background:var(--af-bg)!important;color:var(--af-text)!important;font-family:'Golos Text',system-ui,sans-serif}
header{background:transparent!important;color:var(--af-text)!important}header h1{color:var(--af-text)}header p,header small{color:var(--af-muted)!important}
#messages{scrollbar-color:#486158 var(--af-bg)}
.message{background:var(--af-surface)!important;color:var(--af-text)!important;border:1px solid var(--af-line);border-radius:16px;box-shadow:0 4px 16px #0000000d}
.message.user,.user{background:#25483a!important;color:var(--af-text)!important;border-color:#426351}
.message a{color:#f5bd59!important}.message code,.message pre{background:#0d1e1a!important;color:#e8f0eb!important}
#form{background:var(--af-bg)!important;border-color:var(--af-line)!important}
#question,#afit-member-form input{background:var(--af-surface)!important;color:var(--af-text)!important;border:1px solid #486158!important;border-radius:14px;caret-color:var(--af-amber)}
#question::placeholder,#afit-member-form input::placeholder{color:#9db4a8;opacity:1}
#question:focus,#afit-member-form input:focus{border-color:var(--af-amber)!important;outline:2px solid #f0a92b55;outline-offset:2px}
#send,#afit-member-form button{background:var(--af-amber)!important;color:#14251c!important;border-color:var(--af-amber)!important;font-weight:600}
#send{width:auto!important;min-width:44px;padding:10px 12px!important;border-radius:14px!important}
#send:disabled,#afit-member-form button:disabled{opacity:.5}
#status,#afit-quota,#afit-member-status,.afit-thinking{color:var(--af-muted)!important}
#afit-member-panel{background:var(--af-surface)!important;border-color:var(--af-line)!important;border-radius:16px;padding:14px}
#afit-member-panel h2{color:var(--af-text)!important}#afit-member-panel p,#afit-member-form label{color:var(--af-muted)!important}
a{color:#f5bd59}:focus-visible{outline:2px solid var(--af-amber);outline-offset:3px}
@media(hover:hover){#send:not(:disabled):hover,#afit-member-form button:not(:disabled):hover{background:#f5bb50!important}}
@media(prefers-reduced-motion:no-preference){
.message{animation:afitaMessageIn 320ms cubic-bezier(.2,.65,.25,1) backwards}
#send,#question,#afit-member-form input{transition:background-color 180ms,border-color 180ms,box-shadow 180ms}
@keyframes afitaMessageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
}
@media(prefers-reduced-motion:reduce){.message,#send,#question,#afit-member-form input{animation:none!important;transition:none!important}}
@media print{html,body,.message,.message.user{background:white!important;color:#183d31!important}}
'''

class Structure(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set()
    def handle_starttag(self, tag, attrs):
        self.ids.update(v for k,v in attrs if k == 'id')

def themed(source):
    parser = Structure(); parser.feed(source)
    required = {'messages', 'form', 'question', 'send'}
    if not required.issubset(parser.ids):
        raise ValueError('Неожиданная структура чата: отсутствуют ' + ', '.join(sorted(required-parser.ids)))
    if len(re.findall(r'<main(?:\s[^>]*)?>', source, re.I)) != 1:
        raise ValueError('Не найден единственный <main>; файл не изменён')
    clean = re.sub(r'<style\b[^>]*\bid=[\"\']' + MARKER + r'[\"\'][^>]*>.*?</style\s*>\s*', '', source, flags=re.S|re.I)
    block = '<style id="' + MARKER + '">\n' + CSS.strip() + '\n</style>\n'
    return re.sub(r'<main(?:\s[^>]*)?>', lambda m: block+m[0], clean, count=1, flags=re.I)

def atomic_write(target, data):
    stat = target.stat()
    fd, name = tempfile.mkstemp(prefix='.afita-theme-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(data); out.flush(); os.fsync(out.fileno())
            os.fchmod(out.fileno(), stat.st_mode & 0o777)
            if os.geteuid() == 0: os.fchown(out.fileno(),stat.st_uid,stat.st_gid)
        os.replace(name, target)
    finally:
        if os.path.exists(name): os.unlink(name)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--html', type=Path, default=Path('/var/www/alenafit-assistant/index.html'))
    p.add_argument('--restore', type=Path, help='Restore the exact backup file')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--verify-url', help='Optional public HTTPS chat URL; rollback on verification failure')
    args = p.parse_args(); target = args.html.resolve(strict=True)
    original = target.read_bytes()
    if args.restore:
        updated = args.restore.resolve(strict=True).read_bytes()
    else:
        updated = themed(original.decode('utf-8')).encode('utf-8')
    if original == updated:
        print('Оформление уже установлено. Изменений нет.'); return
    if args.dry_run:
        print('Проверка пройдена. Файл не изменён.'); return
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = target.with_name(target.name+'.before-afita-theme-'+stamp)
    shutil.copy2(target, backup)
    try:
        atomic_write(target, updated)
        if args.verify_url and not args.restore:
            if not args.verify_url.startswith('https://'):
                raise ValueError('--verify-url должен использовать HTTPS')
            sep = '&' if '?' in args.verify_url else '?'
            request = urllib.request.Request(args.verify_url+sep+'theme_check='+stamp, headers={'Cache-Control':'no-cache'})
            with urllib.request.urlopen(request, timeout=20) as response:
                served = response.read().decode('utf-8')
            if MARKER not in served: raise RuntimeError('Сервер пока не отдаёт обновлённый HTML')
    except Exception:
        atomic_write(target, original)
        print('Обновление отменено: исходный HTML восстановлен.')
        raise
    print('Готово. Резервная копия: '+str(backup))
    print('Откат: sudo python3 '+str(Path(__file__).resolve())+' --html '+str(target)+' --restore '+str(backup))
    print('SHA256: '+hashlib.sha256(updated).hexdigest())

if __name__ == '__main__': main()
