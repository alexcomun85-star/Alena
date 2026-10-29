# AFIT_ACCESS_GATE_V1 — inserted before the original HTTPServer starts.
import base64 as _af_b64
import hashlib as _af_hash
import hmac as _af_hmac
import io as _af_io
import re as _af_re
import secrets as _af_secrets
import sqlite3 as _af_sql
import time as _af_time
from http.cookies import SimpleCookie as _AfCookie
from pathlib import Path as _AfPath

_af_config = json.loads(_AfPath('/state/afit_access.json').read_text())
_af_secret = bytes.fromhex(_af_config['secret'])
_af_db_path = '/state/afit_access.sqlite'

def _af_db():
    db = _af_sql.connect(_af_db_path, timeout=10)
    db.execute('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, member_until INTEGER NOT NULL DEFAULT 0)')
    db.execute('CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY, sid TEXT NOT NULL, at INTEGER NOT NULL)')
    return db

def _af_session(handler):
    sid = None
    try:
        cookie = _AfCookie(handler.headers.get('Cookie', ''))
        value = cookie['afit_session'].value.split('.')
        if len(value) == 2 and _af_re.fullmatch(r'[a-f0-9]{48}', value[0]):
            expected = _af_hmac.new(_af_secret, value[0].encode(), _af_hash.sha256).hexdigest()
            if _af_hmac.compare_digest(expected, value[1]): sid = value[0]
    except (KeyError, ValueError, TypeError): pass
    if sid is None: sid = _af_secrets.token_hex(24)
    signature = _af_hmac.new(_af_secret, sid.encode(), _af_hash.sha256).hexdigest()
    handler._af_cookie = 'afit_session='+sid+'.'+signature+'; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax'
    with _af_db() as db:
        db.execute('INSERT OR IGNORE INTO sessions(id) VALUES (?)', (sid,))
        row = db.execute('SELECT used, member_until FROM sessions WHERE id=?', (sid,)).fetchone()
    return sid, row[0], row[1] > int(_af_time.time())

_af_original_end = Handler.end_headers
_af_original_get = Handler.do_GET
_af_original_post = Handler.do_POST

def _af_end(self):
    if getattr(self, '_af_cookie', None):
        self.send_header('Set-Cookie', self._af_cookie)
        self.send_header('Cache-Control', 'no-store')
    return _af_original_end(self)

def _af_get(self):
    if self.path.split('?')[0] != '/session': return _af_original_get(self)
    try:
        sid, used, member = _af_session(self)
        return self.send_json(200, {'remaining': max(0, 30-used), 'member': member, 'limit': 30})
    except Exception:
        return self.send_json(503, {'error': 'Не удалось проверить доступ. Попробуйте позже.'})

def _af_post(self):
    route = self.path.split('?')[0]
    if route not in ('/chat', '/member-login'): return _af_original_post(self)
    origin = self.headers.get('Origin')
    if origin and origin not in ('https://assistant.alenafit.com', 'https://alenafit.com', 'https://www.alenafit.com'):
        return self.send_json(403, {'error': 'Недопустимый источник запроса'})
    if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
        return self.send_json(415, {'error': 'Ожидается JSON'})
    try:
        size = int(self.headers.get('Content-Length', '0'))
        if not 0 < size <= 8192: raise ValueError()
        body = self.rfile.read(size)
        data = json.loads(body)
        if not isinstance(data, dict): raise ValueError()
    except (ValueError, UnicodeDecodeError, TypeError):
        return self.send_json(400, {'error': 'Некорректный запрос'})
    try:
        sid, used, member = _af_session(self)
        if route == '/member-login':
            name, password = data.get('login'), data.get('password')
            now = int(_af_time.time())
            with _af_db() as db:
                db.execute('BEGIN IMMEDIATE')
                db.execute('DELETE FROM login_attempts WHERE at < ?', (now-600,))
                per_session = db.execute('SELECT COUNT(*) FROM login_attempts WHERE sid=?', (sid,)).fetchone()[0]
                total = db.execute('SELECT COUNT(*) FROM login_attempts').fetchone()[0]
                if per_session >= 5 or total >= 30:
                    return self.send_json(429, {'error': 'Слишком много попыток входа. Повторите через 10 минут.'})
                db.execute('INSERT INTO login_attempts(sid, at) VALUES (?, ?)', (sid, now))
            valid_fields = isinstance(name, str) and _af_re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,31}', name) and isinstance(password, str) and 1 <= len(password) <= 128
            valid_password = False
            if valid_fields:
                digest = _af_hash.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(_af_config['salt']), 260000).hex()
                valid_password = _af_hmac.compare_digest(digest, _af_config['password_hash'])
            if not valid_password:
                return self.send_json(401, {'error': 'Проверьте логин и пароль участника.'})
            with _af_db() as db:
                db.execute('UPDATE sessions SET member_until=? WHERE id=?', (now+7*86400, sid))
            return self.send_json(200, {'member': True})
        message = data.get('message')
        if not isinstance(message, str) or not 1 <= len(message.strip()) <= 1500:
            return self.send_json(400, {'error': 'Введите сообщение до 1500 символов'})
        if not member:
            with _af_db() as db:
                db.execute('BEGIN IMMEDIATE')
                used = db.execute('SELECT used FROM sessions WHERE id=?', (sid,)).fetchone()[0]
                if used >= 30:
                    return self.send_json(401, {'error': 'Для продолжения войдите как участник ALENAFIT.', 'code': 'member_required', 'remaining': 0})
                db.execute('UPDATE sessions SET used=used+1 WHERE id=?', (sid,))
    except Exception:
        return self.send_json(503, {'error': 'Не удалось проверить доступ. Попробуйте позже.'})
    self.rfile = _af_io.BytesIO(body)
    return _af_original_post(self)

Handler.end_headers = _af_end
Handler.do_GET = _af_get
Handler.do_POST = _af_post
# AFIT_ACCESS_GATE_END
