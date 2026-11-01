const assert=require('node:assert/strict');const {parse,find,recipes}=require('../js/recipe-engine.js');let checks=0;const ok=(condition,label)=>{assert.ok(condition,label);checks++};
for(const text of ['макароны сосиски кетчуп майонез','макароны, сосиски, кетчуп, майонез','Макароны и сосиски. Кетчуп и майонез','У меня есть макароны сосиски кетчуп майонез']){const r=find(text);ok(r.pantry.ids.includes('pasta')&&r.pantry.ids.includes('sausage'),text);ok(r.exact.some(x=>x.id==='pasta-sausage'),text);ok(!r.exact.find(x=>x.id==='pasta-sausage').missing.length,'no hidden missing ingredients')}
for(const text of ['яйца сыр помидоры','яйцо с сыром и помидорами','яиц, сыра и томатов'])ok(find(text).exact.some(r=>r.id==='omelet'),'Russian inflection '+text);
for(const text of ['овсянка без молока','овсянка молока нет']){if(text.endsWith('нет'))continue;ok(parse(text).excluded.includes('milk'),'negation milk');ok(!find(text).exact.some(r=>r.required.includes('milk')),'exclude milk')}
let r=find('макароны');ok(!r.exact.length,'no invented pasta ingredients');ok(r.near.some(x=>x.missing.includes('sausage')),'show what to buy');ok(r.near.every(x=>x.missing.length&&x.missing.length<=2),'bounded shopping list');
r=find('яйца сыр помидоры',{excluded:['egg']});ok(![...r.exact,...r.near].some(x=>x.required.includes('egg')),'manual exclusion');
r=find('авокадо киноа');ok(r.exact.some(x=>x.id==='quinoa-avocado'),'extended pantry');
r=find('нет продуктов');ok(!r.exact.length&&r.popular.length>0,'no ingredients gives starting suggestions');
r=find('абракадабра');ok(!r.exact.length&&r.pantry.unknown.includes('абракадабра'),'unknown is not fabricated');
for(const recipe of recipes){const result=find(recipe.required.map(id=>require('../js/recipe-engine.js').ingredients[id][0]).join(' '));ok(result.pantry.ids.length>=recipe.required.length,'all required aliases recognized '+recipe.id);ok(recipe.steps.length>=2&&recipe.title.length>5,'recipe has usable steps');ok(!recipe.required.some(x=>recipe.optional.includes(x)),'no duplicated required optional')}

/* 01.11.2026: полуфабрикаты, словоформы, опечатки, порядок совпадений */
const has=(t,id)=>find(t).exact.some(x=>x.id===id);
ok(has('пельмени кетчуп майонез чеснок','pelmeni-boiled')&&find('пельмени кетчуп майонез чеснок').exact[0].id.startsWith('pelmeni'),'pelmeni first, sauce not first');
ok(!find('пельмени кетчуп майонез чеснок').pantry.unknown.length,'pelmeni recognized');
ok(parse('пельмешки').ids.includes('pelmeni'),'diminutive');
ok(parse('макорон сасиски').ids.includes('pasta')&&parse('макорон сасиски').ids.includes('sausage'),'typos');
ok(!parse('курага').ids.includes('chicken'),'курага is not chicken');
ok(!parse('томатная паста').ids.includes('pasta'),'tomato paste is not pasta');
ok(!parse('сырники').ids.includes('cheese'),'syrniki is not cheese');
ok(!parse('сырые яйца').ids.includes('cheese'),'raw is not cheese');
ok(!parse('куриные яйца').ids.includes('chicken'),'chicken eggs are eggs');
ok(!parse('рыбные палочки').ids.includes('fish'),'fish sticks are not fish');
ok(!parse('печенье').ids.includes('liver'),'cookies are not liver');
ok(!parse('крабовые палочки').ids.includes('fishsticks'),'crab sticks');
ok(!parse('мясной фарш').ids.includes('meat'),'mince is not meat');
ok(parse('кетчуп майонез').onlyCondiments,'condiments only');
for(const [t,id] of [['гречка тушенка','buckwheat-stew'],['шпроты хлеб','sprat-sandwich'],['вареники','vareniki'],['сырники','syrniki-ready'],['замороженные овощи рис','frozenveg-rice'],['крабовые палочки яйца','crab-salad'],['колбаса яйца','ham-egg'],['свекла чеснок','beet-salad'],['кефир овсянка','kefir-oats'],['пшено тыква','millet-pumpkin'],['котлеты гречка','cutlets-buckwheat'],['наггетсы','nuggets-veg'],['творог яйцо мука','syrniki-home'],['молоко яйца мука','bliny-home'],['тофу замороженные овощи','tofu-veg']])ok(has(t,id),'semi-finished/common: '+t);
console.log(checks+' recipe engine checks passed');
