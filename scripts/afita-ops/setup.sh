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
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
ssh-keygen -q -t ed25519 -N "" -C afita-github-deploy -f "$TMP/key"
touch /root/.ssh/authorized_keys; chmod 600 /root/.ssh/authorized_keys
cp /root/.ssh/authorized_keys "/root/.ssh/authorized_keys.before-afita-$(date +%s)"
grep -v 'afita-github-deploy$' /root/.ssh/authorized_keys > "$TMP/ak" || true
echo "command=\"$LIB/afita-deploy.sh\",restrict $(cat "$TMP/key.pub")" >> "$TMP/ak"
cat "$TMP/ak" > /root/.ssh/authorized_keys

HOST=$(curl -s -m 10 https://api.ipify.org || hostname -I | awk '{print $1}')
HOSTKEY=$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)
{
  echo "HOST=$HOST"
  echo "PORT=${PORT:-22}"
  echo "KNOWN=$( [ "${PORT:-22}" = 22 ] && echo "$HOST" || echo "[$HOST]:$PORT") $HOSTKEY"
  cat "$TMP/key"
} | base64 -w0 > "$TMP/secret"

echo
echo "ГОТОВО. Ключ GitHub может только: update, check, status, logs."
echo "Отключить доступ: удалить строку с afita-github-deploy в /root/.ssh/authorized_keys"
echo
echo "===== СКОПИРУЙТЕ СТРОКУ НИЖЕ ЦЕЛИКОМ В GitHub → секрет AFITA_DEPLOY ====="
cat "$TMP/secret"; echo
echo "===== КОНЕЦ. Никому не пересылайте эту строку, в том числе в чат. ====="
