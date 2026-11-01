const assert=require('node:assert/strict');const book=require('../js/recipe-book.js');const {find,ingredients}=require('../js/recipe-engine.js');
let checks=0;const ok=(c,l)=>{assert.ok(c,l);checks++};
const banned=/детокс|сжига|ускоря|очища|лечит|терапи|диагност|токсин|кортизол|серотонин|гаранти/i;
ok(book.length>=30,'book has pilot recipes');
const ids=new Set();
for(const r of book){
 ok(!ids.has(r.id),'unique '+r.id);ids.add(r.id);
 const batch=!!r.plan;ok(r.ing.length>=2&&r.ing.length<=(batch?12:8),'products count '+r.id);ok(r.time<=(batch?120:45),'time '+r.id);if(batch){ok(r.days>=3&&r.days<=4&&r.plan.length===r.days,'plan per day '+r.id);ok(r.storage.some(x=>/3–4 дня/.test(x))&&r.storage.some(x=>/2 часа/.test(x)),'storage rules '+r.id)}ok(r.steps.length>=2,'steps '+r.id);
 const n=r.n;ok(n.k>40&&n.k<900,'kcal range '+r.id);
 const fromMacros=n.p*4+n.f*9+n.c*4;ok(Math.abs(fromMacros-n.k)<=20||Math.abs(fromMacros-n.k)/n.k<.12,'kcal matches macros (fibre in USDA carbs) '+r.id);
 ok(r.good.length>=1,'has benefit '+r.id);
 const text=[r.title,...r.steps,...r.good,r.note,r.taste].join(' ');ok(!banned.test(text),'no pseudo-science '+r.id);
 ok(r.refs.every(([t,u])=>/^https:\/\//.test(u)),'refs are https '+r.id);
 ok(r.required.every(id=>ingredients[id]),'required ids known '+r.id);
 const res=find(r.required.map(id=>ingredients[id][0]).join(' '));ok(res.exact.some(x=>x.id===r.id),'findable by own products '+r.id);
}
let r=find('тунец яйца огурец помидор',{excluded:['fish']});ok(![...r.exact,...r.near].some(x=>(x.contains||x.required).includes('tuna')),'fish exclusion covers tuna');
r=find('творог банан яйца',{excluded:['milk']});ok(![...r.exact,...r.near].some(x=>[...x.required,...(x.contains||[])].includes('curd')),'milk exclusion covers dairy');
r=find('овсянка молоко яблоко',{excluded:['nuts']});ok(![...r.exact,...r.near].some(x=>(x.contains||[]).includes('nuts')),'nuts in counted products are excluded');
r=find('курица гречка морковь');ok(r.exact[0]&&r.exact[0].book,'book recipe ranks first when products match');
console.log(checks+' recipe book checks passed');
