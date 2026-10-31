#!/bin/bash
# Одна контрольная генерация недели тем же кодом, что работает в afita-meals.
# Рабочий генератор, его база и дневные лимиты не затрагиваются. Стоимость — несколько центов.
set -euo pipefail
ROOT=$(docker inspect afita-meals --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')
[ -n "$ROOT" ] || { echo "ИТОГ: ОШИБКА: контейнер afita-meals не найден"; exit 1; }
WORK=$(mktemp -d /tmp/afita-check.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
cp -r "$ROOT" "$WORK/app"
echo 'export {buildMenu};' >> "$WORK/app/handler.js"
cat > "$WORK/check.mjs" <<'JS'
import {readFileSync} from 'node:fs';
const {buildMenu}=await import('/dbg/app/handler.js');
const C=globalThis.AfitaAIContract;
const env={OPENAI_API_KEY:readFileSync('/run/secrets/openai_key','utf8').trim(),OPENAI_MODEL:'gpt-4.1-mini'};
const req=C.request({action:'week',requestId:'check_week_'+Date.now().toString(16).padStart(12,'0'),adult:true,target:1800,goal:'maintain',targets:{k:1800,p:110,f:60,c:205},pulses:false,excluded:[]});
const t0=Date.now(),s=()=>((Date.now()-t0)/1000).toFixed(0)+' с';let n=0;
const fetcher=async(url,opt)=>{const i=++n,name=JSON.parse(opt.body).text.format.name,t=Date.now();
 try{const r=await fetch(url,opt);let info='';try{const d=await r.clone().json();info=`статус ${d.status}, токенов ${d.usage?.output_tokens}`+(d.incomplete_details?`, обрыв: ${JSON.stringify(d.incomplete_details)}`:'')+(d.error?`, ошибка: ${JSON.stringify(d.error).slice(0,300)}`:'')}catch{}
  console.log(`Шаг ${i} ${name}: HTTP ${r.status} за ${((Date.now()-t)/1000).toFixed(0)} с, ${info}`);return r;}
 catch(e){console.log(`Шаг ${i} ${name}: СБОЙ ${e.name} через ${((Date.now()-t)/1000).toFixed(0)} с`);throw e;}};
try{const {body,oilAdded}=await buildMenu(req,fetcher,env);
 console.log(`ИТОГ: УСПЕХ за ${s()}, дней ${body.days?.length}, блюд ${(body.days||[]).reduce((a,d)=>a+d.meals.length,0)}`+(oilAdded?.length?`, учтено масло 5 г: ${oilAdded.join('; ')}`:''));}
catch(e){console.log(`ИТОГ: ОШИБКА за ${s()}: ${e.name}: ${e.message}`+(e.reason?` | причина: ${JSON.stringify(e.reason).slice(0,500)}`:''));}
JS
docker run --rm -v "$WORK":/dbg:ro -v /opt/alenafit-assistant/openai_key:/run/secrets/openai_key:ro node:24-bookworm-slim node /dbg/check.mjs
