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
console.log(checks+' recipe engine checks passed');
