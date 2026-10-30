const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.AfitaTargets=require('../js/nutrition-targets.js');const T=global.AfitaTargets;vm.runInNewContext(fs.readFileSync('js/food-db.js','utf8'),{window:global});const N=require('../js/nutrition-plan.js');let count=0;const ok=x=>{assert.ok(x);count++};
const base={mode:'auto',goal:'maintain',age:35,height:160,weight:60,sex:'female',activity:1.4};
let t=T.calculate(base);ok(t.rest===1264);ok(Math.abs(t.maintenance-1769.6)<.01);ok(t.k===1770);ok(t.p===89);ok(t.f===59);ok(Math.abs(t.macroEnergy-t.k)<=5);
t=T.calculate({...base,goal:'lose'});ok(t.k===1590);ok(t.notes.some(x=>x.includes('10%')));
t=T.calculate({...base,mode:'manual',target:1300,goal:'lose'});ok(t.k===1300);ok(t.p===65);ok(t.f===43);ok(t.c===163);ok(Math.abs(t.macroEnergy-1300)<=5);
assert.throws(()=>T.calculate({...base,mode:'manual',target:1200}),/индивидуальная/);assert.throws(()=>T.calculate({...base,weight:40,goal:'lose'}),/дефицит/);assert.throws(()=>T.calculate({...base,age:17}),/19–78/);assert.throws(()=>T.calculate({...base,mode:'manual',target:NaN}));
t=T.calculate({...base,sex:'male',height:180,weight:85,activity:1.6,goal:'lose',strength:true,proteinBasis:'ffm',bodyFat:20});ok(t.p===156);ok(t.method.includes('68.0'));assert.throws(()=>T.calculate({...base,proteinBasis:'ffm',bodyFat:20}),/силовых/);assert.throws(()=>T.calculate({...base,goal:'lose',strength:true,proteinBasis:'ffm',bodyFat:''}),/процент/);
for(const k of [1250,1400,2000,3000,4500])for(const excluded of [[],['milk','egg','fish','nuts']])for(const vegetarian of [false,true]){
 const target=T.calculate({mode:'manual',goal:'maintain',target:k});const profile={adult:true,target:k,targets:target,goal:'maintain',excluded,vegetarian,pulses:vegetarian};const plan=N.generate(profile);ok(plan.days.length===7);
 for(const d of plan.days){ok(['k','p','f','c'].every(x=>Number.isFinite(d[x])&&d[x]>0));ok(d.matched===(Math.abs(d.deviation.k)<=.05&&['p','f','c'].every(x=>Math.abs(d.deviation[x])<=.15)));ok(d.meals.every(m=>N.eligible(N.templates.find(t=>t.id===m.id),profile)));}
 const before=JSON.stringify(plan.days[0].meals[0].parts);N.replace(plan,0,0);ok(before!==JSON.stringify(plan.days[0].meals[0].parts));
 const raw={profile:plan.profile,ids:plan.days.map(d=>d.meals.map(m=>m.id)),portions:plan.days.map(d=>d.meals.map(m=>m.parts))};const restored=N.restore(raw);ok(JSON.stringify(restored.days[0].meals.map(m=>m.parts))===JSON.stringify(plan.days[0].meals.map(m=>m.parts)));ok(restored.days[0].k===plan.days[0].k);
}
// Contradictory macro goals must be flagged, never silently reported as reached.
const impossible=N.generate({adult:true,target:1300,goal:'maintain',vegetarian:true,pulses:true,excluded:['milk','egg','fish'],targets:{k:1300,p:250,f:20,c:30}});ok(impossible.days.some(d=>!d.matched));
console.log(count+' checks: independent REE, manual calories below 1500, FFM applicability, all macros, honest fit and exact saved portions OK');
