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
let calls=0;const provider=async(url,init)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const p=JSON.parse(init.body);assert.equal(p.store,false);assert.equal(p.text.format.strict,true);const days=p.text.format.schema.properties.days;assert.equal(days.minItems,7);assert.equal(days.maxItems,7);assert.equal(days.items.properties.meals.minItems,4);assert.equal(days.items.properties.meals.maxItems,4);assert.equal(p.text.format.type,'json_schema');assert.equal(p.tools,undefined);const input=JSON.parse(p.input[1].content);assert.equal(input.request.weight,undefined);assert.equal(input.request.age,undefined);assert.ok(!init.body.includes('unit-test-placeholder'));return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body)}]}]})};
let env=await environment();assert.equal((await aiStatus({}).json()).ready,false);
assert.equal((await aiRoute(request(),{...env,OPENAI_API_KEY:undefined},{fetcher:provider})).status,503);assert.equal(calls,0);
let response=await aiRoute(request(),env,{fetcher:provider});assert.equal(response.status,200);assert.equal((await response.json()).kind,'ai');assert.equal(calls,1);
response=await aiRoute(request(),env,{fetcher:provider});assert.equal(response.status,200);assert.equal(calls,1,'identical retry returns cached recipes, no second model call');
assert.equal((await aiRoute(request({...req,preferences:'different'}),env,{fetcher:provider})).status,409);assert.equal(calls,1);
assert.equal((await aiRoute(request(req,'192.0.2.2'),env,{fetcher:provider})).status,409,'do not return another caller\'s cached menu');
env=await environment();env.AI_DAY_REQUESTS='1';await aiRoute(request(),env,{fetcher:provider});response=await aiRoute(request({...req,requestId:'another_request_id_000002'}),env,{fetcher:provider});assert.equal(response.status,429,'persistent atomic daily budget');
env=await environment();let attempts=0;const repair=async(...args)=>{attempts++;if(attempts===1){const bad=structuredClone(body);bad.days[0].meals[0].parts[0].food='Unknown';return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(bad)}]}]})}const input=JSON.parse(JSON.parse(args[1].body).input[1].content);assert.ok(input.correction);return provider(...args)};
response=await aiRoute(request(),env,{fetcher:repair});assert.equal(response.status,200);assert.equal(attempts,2,'one bounded correction');
env=await environment();attempts=0;const invalid=async()=>{attempts++;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"days":[]}'}]}]})};response=await aiRoute(request(),env,{fetcher:invalid});assert.equal(response.status,502);assert.equal((await response.clone().json()).reason,'ИИ должен составить семь дней.');assert.equal(attempts,2);assert.equal(env.DB.sqlite.prepare('SELECT result FROM ai_requests').get().result,null,'never cache unvalidated recipes');
console.log('AI server: fail-closed setup, structured provider request, SQLite budget, idempotency, privacy, single correction and invalid-output rejection OK');

const replaceReq={...req,requestId:'replacement_schema_check_000001',action:'replace',day:0,index:0,otherMeals:body.days[0].meals.slice(1),avoidTitles:[]};
env=await environment();let replacementSchema;
response=await aiRoute(request(replaceReq),env,{fetcher:async(url,init)=>{replacementSchema=JSON.parse(init.body).text.format.schema;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({meals:[body.days[0].meals[0]]})}]}]})}});
assert.equal(replacementSchema.properties.meals.minItems,1);assert.equal(replacementSchema.properties.meals.maxItems,1);assert.equal(response.status,200);
console.log('Structured shape: exactly seven days x four meals, one replacement, useful validation reason OK');
