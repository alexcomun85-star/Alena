const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.FOOD_DB=[];vm.runInNewContext(fs.readFileSync('js/food-db.js','utf8'),{window:global});const N=require('../js/nutrition-plan.js');
let checks=0;function ok(x){assert.ok(x);checks++}
for(const target of [1500,2000,3500])for(const vegetarian of [false,true])for(const excluded of [[],['milk','egg','fish','nuts']]){
 const profile={adult:true,target,goal:'lose',vegetarian,pulses:vegetarian,excluded};let plan=N.generate(profile);
 ok(plan.days.length===7);for(const d of plan.days){ok(Number.isFinite(d.k)&&d.k>0);ok(d.meals.length===4);for(const m of d.meals){ok(m.parts.every(([,g])=>Number.isFinite(g)&&g>0));const t=N.templates.find(x=>x.id===m.id);ok(N.eligible(t,profile));const sum=N.totals(m.parts);ok(sum.k===m.k)}}
 const before=N.shopping(plan).reduce((s,[,g])=>s+g,0);ok(before===plan.days.flatMap(d=>d.meals).flatMap(m=>m.parts).reduce((s,[,g])=>s+g,0));
 const old=plan.days[0].meals[0].id;N.replace(plan,0,0);ok(old!==plan.days[0].meals[0].id);ok(Number.isFinite(plan.days[0].k)&&plan.days[0].k>0);
 const restored=N.restore({profile,ids:plan.days.map(d=>d.meals.map(m=>m.id))});ok(restored.days[0].k===plan.days[0].k);
}
assert.throws(()=>N.generate({adult:false,target:2000,goal:'lose'}));assert.throws(()=>N.generate({adult:true,target:900,goal:'lose'}));assert.throws(()=>N.restore({profile:{adult:true,target:2000,goal:'lose'},ids:Array(7).fill(['<script>','x','x','x'])}));
const base={goal:'lose',sleep:'23:00',mealTime:'22:00'};
let r=N.assess({ids:['pasta','mayo'],context:base});ok(r.level===1);ok(r.why.join(' ').includes('майонез'));ok(!r.why.join(' ').includes('после 18'));
r=N.assess({ids:['pasta'],context:{...base,reflux:true}});ok(r.level===2&&r.refs.includes(2));
r=N.assess({ids:['pasta'],nutrition:{k:500},context:{...base,target:2000,eaten:1800,complete:true}});ok(r.level===2);
r=N.assess({ids:['pasta'],nutrition:{k:500},context:{...base,target:2000,eaten:1800,complete:false}});ok(r.level===0);
r=N.assess({context:{sleep:'07:00',mealTime:'23:00'}});ok(r.until===480);
r=N.assess({context:{sleep:'01:00',mealTime:'00:00'}});ok(r.until===60);
console.log(checks+' nutrition checks: calories, exclusions, replacement, persistence and contextual advice OK');
