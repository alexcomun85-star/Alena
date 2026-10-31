#!/bin/bash
# Контрольная генерация недели тем же кодом, что работает в afita-meals.
# Рабочий генератор, его база и дневные лимиты не затрагиваются. Несколько центов за прогон.
# Запуск: sudo bash afita_check_week.sh [число прогонов 1–10]
set -euo pipefail
RUNS=${1:-5}; [[ $RUNS =~ ^([1-9]|10)$ ]] || { echo "Число прогонов 1–10"; exit 2; }
ROOT=$(docker inspect afita-meals --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')
[ -n "$ROOT" ] || { echo "Контейнер afita-meals не найден"; exit 1; }
echo "Версия: $(curl -s -m 5 http://127.0.0.1:18081/api/meal-plan/status | grep -o '"revision":"[^"]*"')"
WORK=$(mktemp -d /tmp/afita-check.XXXXXX); trap 'rm -rf "$WORK"' EXIT
cp -r "$ROOT" "$WORK/app"; echo 'export {buildMenu};' >> "$WORK/app/handler.js"
cat > "$WORK/check.mjs" <<'JS'
import {readFileSync} from 'node:fs';
const {buildMenu}=await import('/dbg/app/handler.js');
const C=globalThis.AfitaAIContract;
const env={OPENAI_API_KEY:readFileSync('/run/secrets/openai_key','utf8').trim(),OPENAI_MODEL:'gpt-4.1-mini'};
const runs=Number(process.argv[2]);let ok=0;
for(let run=1;run<=runs;run++){
 console.log(`=== Прогон ${run}`);
 const req=C.request({action:'week',requestId:'check_week_'+Date.now().toString(16).padStart(12,'0'),adult:true,target:1800,goal:'maintain',targets:{k:1800,p:110,f:60,c:205},pulses:false,excluded:[]});
 const t0=Date.now(),s=()=>((Date.now()-t0)/1000).toFixed(0)+' с';let n=0;
 const fetcher=async(url,opt)=>{const i=++n,name=JSON.parse(opt.body).text.format.name.replace('afita_',''),t=Date.now();
  try{const r=await fetch(url,opt);if(String(r.headers.get('content-type')).includes('event-stream')){console.log(`  Шаг ${i} ${name}: HTTP ${r.status}, ответ потоком (первые данные через ${((Date.now()-t)/1000).toFixed(0)} с)`);return r;}let info='';try{const d=await r.clone().json();const text=(d.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('');
    info=`${d.status}, токенов ${d.usage?.output_tokens}`+(d.incomplete_details?`, обрыв: ${d.incomplete_details.reason}, конец ответа: …${JSON.stringify(text.slice(-160))}`:'')+(d.error?`, ошибка: ${JSON.stringify(d.error).slice(0,300)}`:'')}catch{}
   console.log(`  Шаг ${i} ${name}: ${((Date.now()-t)/1000).toFixed(0)} с, ${info}`);return r;}
  catch(e){console.log(`  Шаг ${i} ${name}: СБОЙ ${e.name} через ${((Date.now()-t)/1000).toFixed(0)} с`);throw e;}};
 try{const {body,oilAdded}=await buildMenu(req,fetcher,env);ok++;
  console.log(`  ИТОГ: УСПЕХ за ${s()}, блюд ${(body.days||[]).reduce((a,d)=>a+d.meals.length,0)}`+(oilAdded?.length?`, учтено масло 5 г: ${oilAdded.join('; ')}`:''));}
 catch(e){console.log(`  ИТОГ: ОШИБКА за ${s()}: ${e.message}`+(e.reason?` | ${String(e.reason).slice(0,400)}`:''));}
}
console.log(`\nУСПЕШНО: ${ok} из ${runs}`);
JS
docker run --rm -v "$WORK":/dbg:ro -v /opt/alenafit-assistant/openai_key:/run/secrets/openai_key:ro node:24-bookworm-slim node /dbg/check.mjs "$RUNS" 2>&1 | grep --line-buffered -v "^Afita generation failed" | sed -u 's/^Afita composition retry: /  ↻ Повтор составления: /'
