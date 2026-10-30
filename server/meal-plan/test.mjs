import assert from 'node:assert/strict';
import {createServer,SQLite} from './server.mjs';
const DB=new SQLite(':memory:');
assert.equal(new SQLite(':memory:').sqlite.prepare('SELECT COUNT(*) AS n FROM ai_requests').get().n,0);
const server=createServer({DB},{trustedProxy:false});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
try{
 let r=await fetch(base+'/api/meal-plan/status',{headers:{Origin:'https://alenafit.com'}});assert.equal(r.status,200);assert.equal((await r.json()).ready,false);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://alenafit.com');
 assert.equal((await fetch(base+'/api/meal-plan/status',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'OPTIONS',headers:{Origin:'https://alenafit.com'}})).status,204);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
 assert.equal((await fetch(base+'/api/meal-plan',{method:'POST',body:'{}'})).status,415);
 assert.equal((await fetch(base+'/chat')).status,404);
 console.log('Existing-server adapter: SQLite, CORS, fail-closed config and route separation OK');
}finally{server.close();}
