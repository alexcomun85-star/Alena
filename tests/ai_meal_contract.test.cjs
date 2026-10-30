const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
vm.runInNewContext(read('js/food-db.js'),{window:global});global.AfitaTargets=require('../js/nutrition-targets.js');
const N=require('../js/nutrition-plan.js'),C=require('../js/ai-meal-contract.js');
const targets=AfitaTargets.calculate({mode:'manual',target:1800,goal:'maintain'}),profile={adult:true,target:1800,goal:'maintain',targets,pulses:false,excluded:[]};
const fixture=N.generate(profile),body={days:fixture.days.map(d=>({meals:d.meals.map((m,i)=>({...C.toRaw({...m,slot:C.slots[i],family:i===0?N.templates.find(t=>t.id===m.id).family:'other',seasonings:[]})}))}))};
const req=C.request({action:'week',requestId:'test_request_week_00000001',...profile,preferences:'Люблю домашнюю кухню',age:50,weight:80,apiKey:'must-not-leave-client'});
assert.equal(req.age,undefined);assert.equal(req.weight,undefined);assert.equal(req.apiKey,undefined);
const parsed=C.normalize(body,req,FOOD_DB);assert.equal(parsed.days.length,7);assert.equal(parsed.days[0].k,fixture.days[0].k);
const copy=()=>structuredClone(body);
let x=copy();x.days[0].meals[0].k=999999;assert.equal(C.normalize(x,req,FOOD_DB).days[0].k,fixture.days[0].k,'ignore invented nutrition');
x=copy();x.days[0].meals[0].parts[0].food='Неведомый суперфуд';assert.throws(()=>C.normalize(x,req,FOOD_DB),/ингредиент/);
x=copy();x.days[0].meals[0].parts[0].grams=3000;assert.throws(()=>C.normalize(x,req,FOOD_DB),/ингредиент/);
x=copy();x.days[0].meals[0].title='<img src=x onerror=alert(1)>';assert.throws(()=>C.normalize(x,req,FOOD_DB),/название/);
x=copy();x.days[0].meals[0].seasonings=['масло'];assert.throws(()=>C.normalize(x,req,FOOD_DB),/приправы/);
x=copy();x.days[1].meals[0]=structuredClone(x.days[0].meals[0]);assert.throws(()=>C.normalize(x,req,FOOD_DB),/повторил/);
x=copy();x.days[0].meals[0].parts.push({food:'Нут варёный',grams:50});assert.throws(()=>C.normalize(x,req,FOOD_DB),/исключения/);
const raw={slot:'snack',family:'other',title:'Десерт из шоколада',time:5,steps:'Подайте нарезанный фрукт с отмеренным шоколадом. Вымойте фрукт перед подачей.',seasonings:[],parts:[{food:'Шоколад молочный',grams:20},{food:'Яблоко',grams:100}]};
assert.throws(()=>C.meal(raw,'snack',{...req,excluded:['milk']},FOOD_DB),/исключения/);
raw.parts[0]={food:'Майонез 67%',grams:10};assert.throws(()=>C.meal(raw,'snack',{...req,excluded:['egg']},FOOD_DB),/исключения/);
raw.parts[0]={food:'Греческий йогурт 2%',grams:120};raw.steps+=' Добавьте масло.';assert.throws(()=>C.meal(raw,'snack',req,FOOD_DB),/неучтённый/);
assert.throws(()=>C.request({...req,targets:{k:1800,p:90,f:60,c:10}}),/КБЖУ/);
x=copy();x.days.forEach(d=>d.meals[0].family='other');assert.equal(C.normalize(x,req,FOOD_DB).warnings.length,1,'breakfast family repetition is advisory, not an empty week');
// Saved plans contain complete recipes. Reload never calls a provider or trusts cached calorie fields.
const context={window:{FOOD_DB,AfitaAIContract:C,AfitaTargets},crypto:require('node:crypto').webcrypto,AbortSignal,fetch:()=>{throw Error('restore must be offline')},module:{exports:{}}};
vm.runInNewContext(read('js/ai-meal-client.js'),context);const A=context.window.AfitaAI;
const saved={kind:'ai',version:1,profile,ai:{requestId:req.requestId,model:'test-fixture',generatedAt:'2026-10-30T12:00:00Z'},body};
const plan=A.restore(saved),again=A.restore(A.serialize(plan));assert.equal(again.days[0].k,fixture.days[0].k);assert.equal(JSON.stringify(again.days.map(d=>d.meals.map(m=>m.parts))),JSON.stringify(fixture.days.map(d=>d.meals.map(m=>m.parts))));
console.log('AI contract: independent arithmetic, constraints, hidden ingredients, preferences privacy and offline full-recipe restore OK');
module.exports={body,profile,req};

assert.doesNotThrow(()=>C.meal({slot:'snack',family:'other',title:'Овощная нарезка',time:5,steps:'Нарежьте сырой огурец и морковь, подайте свежими.',seasonings:[],parts:[{food:'Огурец',grams:100},{food:'Морковь',grams:100}]},'snack',req,FOOD_DB),'сырой must not imply unlisted cheese');
// A prohibition is not an added ingredient. A positive addition later in the step still is.
const noOil={slot:'breakfast',family:'pancakes',title:'Овсяные оладьи с бананом',time:15,steps:'Измельчите хлопья и смешайте с яйцом и бананом. Выпекайте на антипригарной сковороде без масла и молока.',seasonings:[],parts:[{food:'Овсяные хлопья сухие',grams:40},{food:'Яйцо куриное',grams:50},{food:'Банан',grams:100}]};
assert.doesNotThrow(()=>C.meal(noOil,'breakfast',req,FOOD_DB));
assert.throws(()=>C.meal({...noOil,steps:noOil.steps+' Затем добавьте масло.'},'breakfast',req,FOOD_DB),/неучтённый ингредиент: масло/);
assert.throws(()=>C.meal({...noOil,steps:'Смешайте хлопья с молоком и яйцом. Выпекайте на сковороде.'},'breakfast',req,FOOD_DB),/неучтённый ингредиент: молоко/);
const several=copy();several.days[0].meals[0].parts[0].food='Неизвестный продукт';several.days[1].meals[0].parts[0].food='Другой неизвестный продукт';
assert.throws(()=>C.normalize(several,req,FOOD_DB),e=>e.message.includes('День 1')&&e.message.includes('День 2'),'report all affected meals for a single focused repair');

// Regression: the VPS used substring matching and interpreted «сырой» as cheese.
const casserole={slot:'breakfast',family:'bake',title:'Творожная запеканка с изюмом',time:40,steps:'1. Промойте изюм. Смешайте творог с яйцом и хлопьями. Сырой смесью заполните силиконовую форму без масла.\n2. Запекайте при 180 °C до готовности: внутри не менее 71 °C. Дайте немного остыть.',seasonings:[],parts:[{food:'Творог 5%',grams:150},{food:'Яйцо куриное',grams:50},{food:'Овсяные хлопья сухие',grams:20},{food:'Изюм',grams:20}]};
assert.doesNotThrow(()=>C.meal(casserole,'breakfast',req,FOOD_DB));
for(const [step,label] of [[' Добавьте сыр.','сыр'],[' Смажьте форму маслом.','масло'],[' Добавьте мёд.','мёд'],[' Добавьте медом сладость.','мёд']])assert.throws(()=>C.meal({...casserole,steps:casserole.steps+step},'breakfast',req,FOOD_DB),e=>e.message.includes('неучтённый ингредиент: '+label));
assert.doesNotThrow(()=>C.meal({...casserole,steps:casserole.steps+' Подавайте как небольшие медальоны.'},'breakfast',req,FOOD_DB),'medallions are not honey');
assert.equal(read('js/ai-meal-contract.js'),read('server/meal-plan/contract.js'),'browser and server must apply exactly the same validation');
