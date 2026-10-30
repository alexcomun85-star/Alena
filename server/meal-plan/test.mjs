import assert from 'node:assert/strict';
import {createServer,SQLite,repairBudgets} from './server.mjs';
const DB=new SQLite(':memory:');
assert.equal(new SQLite(':memory:').sqlite.prepare('SELECT COUNT(*) AS n FROM ai_requests').get().n,0);
const server=createServer({DB},{trustedProxy:false});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
try{
 let r=await fetch(base+'/api/meal-plan/status',{headers:{Origin:'https://alenafit.com'}});assert.equal(r.status,200);const status=await r.json();assert.equal(status.ready,false);assert.equal(status.revision,'staged-recipes-20261030-3');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://alenafit.com');
 assert.equal((await fetch(base+'/api/meal-plan/status',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'OPTIONS',headers:{Origin:'https://alenafit.com'}})).status,204);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'POST',body:'{}'})).status,415);
 assert.equal((await fetch(base+'/chat')).status,404);
 console.log('Existing-server adapter: SQLite, CORS, fail-closed config and route separation OK');
}finally{server.close();}

await import('./generation.test.mjs');

await import('./balance.test.mjs');

const repairDB=new SQLite(':memory:'),time=Date.UTC(2026,9,30,12),day=Math.floor(time/86400000);
const statuses=['done','done','failed','failed','failed','pending','pending'];
for(let i=0;i<statuses.length;i++)repairDB.sqlite.prepare('INSERT INTO ai_requests (id,request_hash,owner,status,result,expires) VALUES (?,?,?,?,?,?)').run('old-'+i,'hash','owner-a',statuses[i],null,time+86400000-(i===6?220000:0));
repairDB.sqlite.prepare('INSERT INTO ai_budget (bucket,used,expires) VALUES (?,?,?)').run('global:'+day,20,time+86400000);
repairDB.sqlite.prepare('INSERT INTO ai_budget (bucket,used,expires) VALUES (?,?,?)').run('user:'+day+':owner-a',5,time+86400000);
repairBudgets(repairDB,time);
assert.equal(repairDB.sqlite.prepare('SELECT used FROM ai_budget WHERE bucket=?').get('global:'+day).used,7,'preserve all real attempts, remove only inflated blocked-click charges');
assert.equal(repairDB.sqlite.prepare('SELECT used FROM ai_budget WHERE bucket=?').get('user:'+day+':owner-a').used,2,'restart abandons old in-flight work; only the two completed menus consume personal allowance');
assert.equal(repairDB.sqlite.prepare("SELECT COUNT(*) AS n FROM ai_requests WHERE status='failed_refunded'").get().n,5);
repairBudgets(repairDB,time);assert.equal(repairDB.sqlite.prepare('SELECT used FROM ai_budget WHERE bucket=?').get('global:'+day).used,7,'restart repair is idempotent');
console.log('Existing quota repair: legacy failed/stale menus credited, real service attempts retained, inflated counts repaired idempotently OK');
