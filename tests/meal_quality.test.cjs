const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
vm.runInNewContext(fs.readFileSync('js/food-db.js','utf8'),{window:global});const T=require('../js/nutrition-targets'),N=require('../js/nutrition-plan');let checks=0;const ok=(x,msg)=>{assert.ok(x,msg);checks++};
ok(N.templates.length>=45,'use a varied curated catalogue');
for(const t of N.templates){ok(N.totals(t.parts).k>0);ok(t.steps.length>20);ok(t.source[1].startsWith('https://'));ok(t.time>=5&&t.time<=60)}
for(const target of [1300,1800,2400])for(const seed of [0,1,7]){
 const profile={adult:true,target,goal:'maintain',targets:T.calculate({mode:'manual',target,goal:'maintain'})};const p=N.generate(profile,seed),ids=p.days.flatMap(d=>d.meals.map(m=>m.id));ok(new Set(ids).size===28,'no dish repeats in an unrestricted week');
 for(const d of p.days){ok(d.meals[1].id!==d.meals[3].id);for(const m of d.meals){const t=N.templates.find(t=>t.id===m.id),ratios=m.parts.map((x,i)=>x[1]/t.parts[i][1]),scale=ratios.reduce((a,b)=>a+b,0)/ratios.length;
  const lower=Math.max(...m.parts.map(([n,g],i)=>(g-(n==='Яйцо куриное'?0:n.startsWith('Масло')?.5:2.5))/t.parts[i][1]));const upper=Math.min(...m.parts.map(([n,g],i)=>(g+(n==='Яйцо куриное'?0:n.startsWith('Масло')?.5:2.5))/t.parts[i][1]));ok(lower<=upper+1e-9,'a single whole-recipe scale explains every ingredient');
  for(const [name,g] of m.parts){if(name==='Яйцо куриное')ok(g%50===0,'whole eggs');else if(!name.startsWith('Масло'))ok(g%5===0,'weighable quantities')}
  ok(m.parts.reduce((s,x)=>s+x[1],0)<=(t.slot==='main'?750:t.slot==='snack'?400:650),'bounded ordinary plate');
 }ok(Math.abs(d.k-target)/target<.1,'ordinary targets stay close without destroying recipes');}
 const raw={profile:p.profile,ids:p.days.map(d=>d.meals.map(m=>m.id)),portions:p.days.map(d=>d.meals.map(m=>m.parts))};ok(JSON.stringify(N.restore(raw).days.map(d=>d.meals.map(m=>m.parts)))===JSON.stringify(raw.portions),'exact saved portions');
 const before=p.days[0].meals[1].id;N.replace(p,0,1);ok(p.days[0].meals[1].id!==before);ok(p.days[0].meals[1].id!==p.days[0].meals[3].id);
}
for(const excluded of [['milk'],['fish'],['nuts'],['egg'],['milk','fish','nuts','egg']])for(const vegetarian of [false,true]){
 const p=N.generate({adult:true,target:1800,goal:'maintain',excluded,vegetarian,targets:T.calculate({mode:'manual',target:1800,goal:'maintain'})});
 for(const m of p.days.flatMap(d=>d.meals)){const t=N.templates.find(t=>t.id===m.id);ok(N.eligible(t,p.profile));if(excluded.includes('milk'))ok(!m.parts.some(([n])=>/молок|творог|сыр|йогурт|кефир|сливоч|сметан/i.test(n)));if(excluded.includes('fish'))ok(!m.parts.some(([n])=>/лосось|сёмга|треска|тунец/i.test(n)))}
}
const high=N.generate({adult:true,target:5000,goal:'maintain',targets:{k:5000,p:250,f:167,c:625}});ok(high.days.every(d=>!d.matched),'large targets cannot produce giant plates');
console.log(checks+' meal quality checks: catalogue, diversity, recipe proportions, whole eggs, plate sizes, exclusions, honest limits and saved portions');
