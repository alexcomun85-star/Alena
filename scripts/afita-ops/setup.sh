#!/bin/bash
# Однократная настройка: GitHub получает ограниченный ключ, который умеет только
# обновить генератор Афиты, прогнать проверку, показать статус и журнал.
# Запуск: sudo bash setup.sh <полный SHA коммита, из которого взяты скрипты>
set -euo pipefail
SHA=${1:-}
[[ $SHA =~ ^[a-f0-9]{40}$ ]] || { echo "Нужен полный SHA коммита"; exit 2; }
[ "$(id -u)" = 0 ] || { echo "Запустите через sudo"; exit 2; }
docker inspect afita-meals >/dev/null 2>&1 || { echo "Контейнер afita-meals не найден — ничего не изменено"; exit 1; }

LIB=/usr/local/lib/afita
RAW=https://raw.githubusercontent.com/alexcomun85-star/Alena/$SHA/scripts
install -d -m 755 "$LIB"
for f in afita-ops/afita-deploy.sh afita-ops/check.sh update_ai_meals.py; do
  curl -fsSL "$RAW/$f" -o "$LIB/$(basename "$f").new"
done
for f in afita-deploy.sh check.sh update_ai_meals.py; do
  [ -s "$LIB/$f.new" ] || { echo "Пустой файл $f — ничего не изменено"; exit 1; }
  mv "$LIB/$f.new" "$LIB/$f"
done
chown -R root:root "$LIB"; chmod 755 "$LIB/afita-deploy.sh" "$LIB/check.sh"; chmod 644 "$LIB/update_ai_meals.py"

PERMIT=$(sshd -T 2>/dev/null | awk '/^permitrootlogin/{print $2}')
PORT=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')
if [ "$PERMIT" = "no" ]; then echo "В sshd запрещён вход root (PermitRootLogin no) — ключ не заработает. Ничего не изменено."; exit 1; fi

install -d -m 700 /root/.ssh
python3 -c 'import cryptography' 2>/dev/null || apt-get install -y -qq python3-cryptography >/dev/null
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
# Короткий ключ: 32 байта seed ed25519 (43 символа). Полный ключ GitHub восстановит из него сам.
python3 - "$TMP" <<'PY'
import os,sys,base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization as S
seed=os.urandom(32);pub=Ed25519PrivateKey.from_private_bytes(seed).public_key().public_bytes(S.Encoding.OpenSSH,S.PublicFormat.OpenSSH).decode()
open(sys.argv[1]+'/seed','w').write(base64.urlsafe_b64encode(seed).decode().rstrip('='))
open(sys.argv[1]+'/key.pub','w').write(pub+' afita-github-deploy\n')
PY
touch /root/.ssh/authorized_keys; chmod 600 /root/.ssh/authorized_keys
cp /root/.ssh/authorized_keys "/root/.ssh/authorized_keys.before-afita-$(date +%s)"
grep -v 'afita-github-deploy$' /root/.ssh/authorized_keys > "$TMP/ak" || true
echo "command=\"$LIB/afita-deploy.sh\",restrict $(cat "$TMP/key.pub")" >> "$TMP/ak"
cat "$TMP/ak" > /root/.ssh/authorized_keys

HOST=$(curl -4 -s -m 10 https://api.ipify.org || hostname -I | awk '{print $1}')
HOSTKEY=$(cut -d' ' -f2 /etc/ssh/ssh_host_ed25519_key.pub)
SECRET="AF1|$(cat "$TMP/seed")|$HOST|${PORT:-22}|$HOSTKEY"

echo
echo "ГОТОВО. Ключ GitHub может только: update, check, status, logs."
echo "Отключить доступ: удалить строку с afita-github-deploy в /root/.ssh/authorized_keys"
echo
echo "===== СКОПИРУЙТЕ ОДНУ СТРОКУ НИЖЕ В GitHub → секрет AFITA_DEPLOY ====="
echo "$SECRET"
echo "===== КОНЕЦ. Никому не пересылайте её, в том числе в чат. ====="
echo "Для сверки (это можно присылать): длина ${#SECRET}, контроль $(printf '%s' "$SECRET" | sha256sum | cut -c1-8)"
