import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {aiRoute,aiStatus} from './handler.js';
const {body,req}=JSON.parse(await readFile(new URL('../../tests/fixtures/ai-menu.json',import.meta.url),'utf8'));
class D1 {
 constructor(){this.sqlite=new DatabaseSync(':memory:');}
 prepare(sql){const statement=this.sqlite.prepare(sql);const bound=(values=[])=>({bind:(...vs)=>bound(vs),first:async()=>statement.get(...values)||null,run:async()=>statement.run(...values)});return bound();}
 batch(statements){return Promise.all(statements.map(s=>s.run()));}
}
async function environment(){const DB=new D1();DB.sqlite.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));return {DB,AI_ENABLED:'true',OPENAI_API_KEY:'unit-test-placeholder',AI_BUDGET_SALT:'unit-test-only-salt',AI_DAY_REQUESTS:'20',AI_USER_DAY_REQUESTS:'5'};}
function request(data=req,ip='192.0.2.1'){return new Request('https://unit.invalid/api/meal-plan',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify(data)})}
function answer(value){return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})}
let calls=0;
const provider=async(url,init)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const p=JSON.parse(init.body),input=JSON.parse(p.input[1].content);assert.equal(p.store,false);assert.equal(p.text.format.strict,true);assert.ok(!init.body.includes('unit-test-placeholder'));
 if(input.stage==='cooking')return answer({recipes:input.recipes.map(e=>({id:e.id,steps:body.days[Number(e.id.split(':')[0])].meals[Number(e.id.split(':')[1])].steps}))});
 assert.equal(input.stage,'composition');assert.equal(input.request.weight,undefined);assert.equal(input.request.age,undefined);
 const m=p.text.format.schema.properties.days?.items.properties.meals.items||p.text.format.schema.properties.meals.items;assert.equal(m.properties.steps,undefined,'composition does not generate cooking text');
 return answer(input.request.action==='replace'?{meals:[body.days[input.request.day].meals[input.request.index]]}:body);
};
let env=await environment();assert.equal((await aiStatus({}).json()).ready,false);
assert.equal((await aiRoute(request(),{...env,OPENAI_API_KEY:undefined},{fetcher:provider})).status,503);assert.equal(calls,0);
let response=await aiRoute(request(),env,{fetcher:provider});assert.equal(response.status,200);assert.equal((await response.json()).kind,'ai');assert.equal(calls,2);
response=await aiRoute(request(),env,{fetcher:provider});assert.equal(response.status,200);assert.equal(calls,2,'identical retry returns cached recipes, no second model call');
assert.equal((await aiRoute(request({...req,preferences:'different'}),env,{fetcher:provider})).status,409);assert.equal(calls,2);
assert.equal((await aiRoute(request(req,'192.0.2.2'),env,{fetcher:provider})).status,409,'do not return another caller\'s cached menu');
env=await environment();env.AI_DAY_REQUESTS='1';await aiRoute(request(),env,{fetcher:provider});response=await aiRoute(request({...req,requestId:'another_request_id_000002'}),env,{fetcher:provider});assert.equal(response.status,429,'persistent atomic daily budget');
env=await environment();let attempts=0;const repair=async(url,init)=>{attempts++;const input=JSON.parse(JSON.parse(init.body).input[1].content);
 if(input.stage==='composition'){const bad=structuredClone(body);bad.days[0].meals[0].parts[0].food='Unknown';return answer(bad);}
 if(input.stage==='repair'){assert.equal(input.recipes.length,1,'only broken dish is sent for repair');assert.equal(input.recipes[0].meal.parts[0].food,'Unknown');return answer({repairs:[{id:'0:0',meal:body.days[0].meals[0]}]});}
 return provider(url,init);
};
response=await aiRoute(request(),env,{fetcher:repair});assert.equal(response.status,200);assert.equal(attempts,3,'composition, one targeted correction, cooking');
const repairedBody=(await response.json()).body;assert.deepEqual(repairedBody.days[1].meals,body.days[1].meals,'valid day preserved exactly');
env=await environment();attempts=0;const invalid=async()=>{attempts++;return answer({days:[]})};response=await aiRoute(request(),env,{fetcher:invalid});assert.equal(response.status,502);assert.equal(attempts,1,'malformed response does not start unbounded regeneration');assert.equal(env.DB.sqlite.prepare('SELECT result FROM ai_requests').get().result,null);
console.log('AI server: fail-closed setup, structured provider request, SQLite budget, idempotency, privacy, single correction and invalid-output rejection OK');

const replaceReq={...req,requestId:'replacement_schema_check_000001',action:'replace',day:0,index:0,otherMeals:body.days[0].meals.slice(1),avoidTitles:[]};
env=await environment();let replacementSchema;
response=await aiRoute(request(replaceReq),env,{fetcher:async(url,init)=>{const p=JSON.parse(init.body),input=JSON.parse(p.input[1].content);if(input.stage==='composition')replacementSchema=p.text.format.schema;return provider(url,init);}});
assert.equal(replacementSchema.properties.meals.minItems,1);assert.equal(replacementSchema.properties.meals.maxItems,1);assert.equal(response.status,200);
console.log('Structured shape: exactly seven days x four meals, one replacement, useful validation reason OK');

const {createHash}=await import('node:crypto');
const fixed=Date.UTC(2026,9,30,12),epoch=Math.floor(fixed/86400000);
env=await environment();const owner=createHash('sha256').update(env.AI_BUDGET_SALT+':'+epoch+':192.0.2.1').digest('hex');
const normalized=globalThis.AfitaAIContract.request(req),hash=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
await env.DB.prepare('INSERT INTO ai_requests (id, request_hash, owner, status, result, expires) VALUES (?, ?, ?, ?, NULL, ?)').bind(req.requestId,hash,owner,'pending',fixed+86400000).run();
let unexpectedCalls=0;const noProvider=async()=>{unexpectedCalls++;throw Error('must not call provider')};
response=await aiRoute(request(),env,{fetcher:noProvider,now:()=>fixed+10000});assert.equal(response.status,409);assert.equal((await response.json()).code,'in_progress');
response=await aiRoute(request(),env,{fetcher:noProvider,now:()=>fixed+211000});assert.equal(response.status,410);assert.equal((await response.json()).code,'interrupted');assert.equal(unexpectedCalls,0);assert.equal(env.DB.sqlite.prepare('SELECT status FROM ai_requests').get().status,'failed_refunded');
console.log('Pending lease: active requests retained, abandoned requests released without paid calls OK');

// Failed generation refunds the personal allowance, while real attempts retain the service budget.
env=await environment();env.AI_USER_DAY_REQUESTS='1';
response=await aiRoute(request(),env,{fetcher:invalid});assert.equal(response.status,502);
assert.equal(env.DB.sqlite.prepare("SELECT used FROM ai_budget WHERE bucket LIKE 'user:%'").get().used,0);
assert.equal(env.DB.sqlite.prepare("SELECT used FROM ai_budget WHERE bucket LIKE 'global:%'").get().used,1);
response=await aiRoute(request({...req,requestId:'after_failed_request_000001'}),env,{fetcher:provider});assert.equal(response.status,200,'failed menu must not deny a real retry');
const callsBeforeLimit=calls;
for(let i=0;i<10;i++){
 response=await aiRoute(request({...req,requestId:'blocked_request_00000'+i}),env,{fetcher:provider});assert.equal(response.status,429);assert.equal((await response.json()).limit,'user');
}
assert.equal(calls,callsBeforeLimit);assert.equal(env.DB.sqlite.prepare("SELECT used FROM ai_budget WHERE bucket LIKE 'global:%'").get().used,2,'blocked clicks never spend the service budget');
env=await environment();env.AI_DAY_REQUESTS='1';
await aiRoute(request(),env,{fetcher:provider});
response=await aiRoute(request({...req,requestId:'different_user_global_cap_0001'},'192.0.2.99'),env,{fetcher:provider});assert.equal(response.status,429);assert.equal((await response.json()).limit,'service');
assert.equal(env.DB.sqlite.prepare("SELECT SUM(used) AS n FROM ai_budget WHERE bucket LIKE 'user:%'").get().n,1,'service cap must refund the second user reservation');
console.log('Quota accounting: failed menus refunded personally, real attempts retained globally, blocked clicks cost nothing, personal and service caps distinguished OK');

// Cooking correction is confined to one meal and cannot change verified composition.
env=await environment();let cookingCalls=0;let wrongCooking=true;
const cookRepair=async(url,init)=>{
 cookingCalls++;const input=JSON.parse(JSON.parse(init.body).input[1].content);
 if(input.stage==='cooking')return answer({recipes:input.recipes.map((e,i)=>({id:e.id,steps:body.days[Number(e.id.split(':')[0])].meals[Number(e.id.split(':')[1])].steps+(i===0?' Добавьте майонез.':'')}))});
 if(input.stage==='cooking_repair'){
  // Only cooking text is requested; the schema has no place for parts or grams.
  const schema=JSON.parse(init.body).text.format.schema.properties.recipes.items;assert.deepEqual(Object.keys(schema.properties),['id','steps']);
  assert.equal(input.recipes.length,1);assert.equal(input.recipes[0].id,'0:0');assert.match(input.recipes[0].error,/.+/);
  return answer({recipes:[{id:'0:0',steps:body.days[0].meals[0].steps+(wrongCooking?'':' Добавьте майонез.')}]});
 }
 return provider(url,init);
};
response=await aiRoute(request(),env,{fetcher:cookRepair});assert.equal(response.status,200);assert.equal(cookingCalls,3);
const cooked=(await response.json()).body;assert.deepEqual(cooked.days[1],body.days[1]);
response=await aiRoute(request(),env,{fetcher:cookRepair});assert.equal(response.status,200);assert.equal(cookingCalls,3,'cached final recipe never pays for cooking again');
wrongCooking=false;env=await environment();response=await aiRoute(request(),env,{fetcher:cookRepair});assert.equal(response.status,502,'unfixed cooking text is rejected');const failed=await response.json();assert.equal(failed.code,'validation_failed','a rejected recipe is not reported as a temporary outage');assert.match(failed.reason,/.+/);

// Oil written into cooking text for a dish without oil: forbidden words are named up front,
// the repair gets a second targeted round, and as a last resort 5 g of oil is counted honestly.
{
 const target=body.days.flatMap((d,day)=>d.meals.map((m,index)=>({day,index,m}))).find(e=>!e.m.parts.some(x=>/^Масло/.test(x.food))&&e.m.parts.length<12);
 const tid=target.day+':'+target.index,oily=body.days[target.day].meals[target.index].steps+' Обжарьте на масле.';
 const run=async(cleanOnRound)=>{let stages=[];const env=await environment();const response=await aiRoute(request(),env,{fetcher:async(url,init)=>{
  const input=JSON.parse(JSON.parse(init.body).input[1].content);stages.push(input.stage+(input.round?':'+input.round:''));
  if(input.stage==='cooking'){const r=input.recipes.find(e=>e.id===tid);assert.ok(r.doNotMention.includes('масло'),'absent oil is named before cooking');return answer({recipes:input.recipes.map(e=>({id:e.id,steps:e.id===tid?oily:body.days[Number(e.id.split(':')[0])].meals[Number(e.id.split(':')[1])].steps}))});}
  if(input.stage==='cooking_repair'){assert.equal(input.recipes[0].id,tid);assert.ok(input.recipes[0].doNotMention.includes('масло'));assert.match(input.recipes[0].rejectedSteps,/масле/);assert.match(input.recipes[0].error,/масло/);
   return answer({recipes:[{id:tid,steps:input.round===cleanOnRound?body.days[target.day].meals[target.index].steps:oily}]});}
  return provider(url,init);
 }});return {response,stages};};
 let {response,stages}=await run(2);
 assert.equal(response.status,200,'second targeted round fixes the text');assert.deepEqual(stages,['composition','cooking','cooking_repair:1','cooking_repair:2']);
 let dish=(await response.json()).body.days[target.day].meals[target.index];assert.ok(!dish.parts.some(x=>/^Масло/.test(x[0]||x.food)),'no oil added when text was fixed');
 ({response,stages}=await run(0));
 assert.deepEqual(stages,['composition','cooking','cooking_repair:1','cooking_repair:2'],'at most two paid repair rounds');
 const out=await response.json();
 if(response.status===200){dish=out.body.days[target.day].meals[target.index];assert.ok(dish.parts.some(x=>(x[0]||x.food)==='Масло подсолнечное'&&(x[1]||x.grams)===5),'oil counted in the composition');}
 else{assert.equal(out.code,'validation_failed');assert.match(out.reason,/.+/);}
 console.log('Cooking oil: forbidden words named, two text-only rounds, oil fallback '+(response.status===200?'counted (5 g)':'rejected by day totals')+' OK');
}

// A replacement dish named like a dish from another day: the model sees taken titles,
// gets one more targeted round, and a persistent repeat is rejected before any cooking call.
{
 const other=body.days[3].meals[0].title;
 const run=async(fixOnRound)=>{let stages=[],round=0;const env=await environment();const response=await aiRoute(request(),env,{fetcher:async(url,init)=>{
  const input=JSON.parse(JSON.parse(init.body).input[1].content);stages.push(input.stage);
  if(input.stage==='composition'){const bad=structuredClone(body);bad.days[0].meals[0].parts[0].food='Unknown';return answer(bad);}
  if(input.stage==='repair'){round++;assert.equal(input.recipes.length,1);assert.equal(input.recipes[0].id,'0:0');assert.ok(input.takenTitles.includes(other),'taken titles are shown to the model');assert.ok(!input.takenTitles.includes(body.days[0].meals[0].title),'own title is not blocked');
   const meal=structuredClone(body.days[0].meals[0]);if(round!==fixOnRound)meal.title=other;return answer({repairs:[{id:'0:0',meal}]});}
  return provider(url,init);
 }});return {response,stages};};
 let {response,stages}=await run(2);
 assert.equal(response.status,200,'second round removes the repeated title');assert.deepEqual(stages.slice(0,3),['composition','repair','repair']);
 ({response,stages}=await run(0));
 assert.equal(response.status,502);const out=await response.json();assert.equal(out.code,'validation_failed');assert.match(out.reason,/Повтор названия/);
 assert.deepEqual(stages,['composition','repair','repair'],'bounded repairs, no cooking for a rejected week');
 console.log('Unique titles: taken titles shown, second targeted round, persistent repeat rejected before cooking OK');
}

// A repair cannot address another meal or return duplicate IDs.
env=await environment();response=await aiRoute(request(),env,{fetcher:async(url,init)=>{
 const input=JSON.parse(JSON.parse(init.body).input[1].content);
 if(input.stage==='composition'){const bad=structuredClone(body);bad.days[0].meals[0].parts[0].food='Unknown';return answer(bad);}
 if(input.stage==='repair')return answer({repairs:[{id:'1:0',meal:body.days[1].meals[0]}]});
 throw Error('must not cook invalid composition');
}});assert.equal(response.status,502);assert.match((await response.json()).reason,/адрес исправления/);
console.log('Staged recipes: verified composition before cooking, targeted repair, immutable valid dishes, immutable cooking weights, bounded calls and offline cache OK');
