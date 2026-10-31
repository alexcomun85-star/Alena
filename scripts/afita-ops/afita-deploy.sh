#!/bin/bash
# Единственная команда, доступная ключу GitHub (command= в authorized_keys).
# Терминала нет; принимаются только перечисленные действия с проверенными параметрами.
# Код из репозитория попадает только в изолированный контейнер afita-meals;
# сам обновлятель и эти скрипты — локальные копии, установленные setup.sh.
set -euo pipefail
LIB=/usr/local/lib/afita
cmd=${SSH_ORIGINAL_COMMAND:-}
exec 9>/run/lock/afita-deploy.lock
flock -w 600 9 || { echo "Занято другим запуском"; exit 75; }
case "$cmd" in
  update\ *)
    sha=${cmd#update }
    [[ $sha =~ ^[a-f0-9]{40}$ ]] || { echo "Нужен полный SHA коммита"; exit 2; }
    python3 "$LIB/update_ai_meals.py" --commit "$sha"
    ;;
  check\ *)
    runs=${cmd#check }
    [[ $runs =~ ^[1-5]$ ]] || { echo "Число прогонов 1–5"; exit 2; }
    for i in $(seq "$runs"); do echo "=== Прогон $i"; bash "$LIB/check.sh" || true; done
    ;;
  status)
    docker ps -a --filter name=afita-meals --format '{{.Names}} | {{.Status}}'
    curl -s -m 5 http://127.0.0.1:18081/api/meal-plan/status; echo
    ;;
  logs)
    docker logs --tail 60 afita-meals 2>&1
    ;;
  *)
    echo "Разрешены: update <sha>, check <1-5>, status, logs"; exit 2
    ;;
esac
