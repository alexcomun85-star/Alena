// Uses the existing Afita key via a read-only Docker secret mount.
import http from 'node:http';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {aiRoute,aiStatus} from './handler.js';
export class SQLite {
 constructor(path){this.sqlite=new DatabaseSync(path);this.sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');this.sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8').replaceAll('CREATE TABLE `','CREATE TABLE IF NOT EXISTS `').replaceAll('CREATE INDEX `','CREATE INDEX IF NOT EXISTS `'));}
 prepare(sql){const statement=this.sqlite.prepare(sql);const bound=(values=[])=>({bind:(...vs)=>bound(vs),first:async()=>statement.get(...values)||null,run:async()=>statement.run(...values)});return bound();}
 async batch(statements){return Promise.all(statements.map(s=>s.run()));}
}
// Rebuild only counters inflated by the old accounting; retain every real attempt.
export function repairBudgets(DB,time=Date.now()){
 const epoch=Math.floor(time/86400000),start=(epoch+1)*86400000,end=(epoch+2)*86400000,prefix='user:'+epoch+':';const db=DB.sqlite;
 db.exec('BEGIN IMMEDIATE');
 try{
  db.prepare("UPDATE ai_requests SET status='failed_refunded' WHERE status='failed' OR (status='pending' AND expires < ?)").run(time+86400000-210000);
  const count=db.prepare('SELECT COUNT(*) AS n FROM ai_requests WHERE expires >= ? AND expires < ?').get(start,end).n;
  db.prepare('INSERT INTO ai_budget (bucket, used, expires) VALUES (?, ?, ?) ON CONFLICT(bucket) DO UPDATE SET used=excluded.used, expires=excluded.expires').run('global:'+epoch,count,end);
  db.prepare("UPDATE ai_budget SET used=(SELECT COUNT(*) FROM ai_requests WHERE owner=substr(ai_budget.bucket, ?) AND status IN ('done','pending') AND expires >= ? AND expires < ?) WHERE bucket LIKE ?").run(prefix.length+1,start,end,prefix+'%');
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
const origins=new Set(['https://alenafit.com','https://www.alenafit.com','https://assistant.alenafit.com']);
export function createServer(env,{fetcher=fetch,trustedProxy=true}={}){
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const cors={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Vary':'Origin'};
  if(origin&&!origins.has(origin)){res.writeHead(403,cors);res.end('{"error":"Недопустимый источник запроса"}');return;}
  if(origin)Object.assign(cors,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
  if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return;}
  const path=new URL(req.url,'http://localhost').pathname;
  if(!['/api/meal-plan','/api/meal-plan/status'].includes(path)){res.writeHead(404,cors);res.end('{}');return;}
  try{
   let response;
   if(path.endsWith('/status')){if(req.method!=='GET'){res.writeHead(405,cors);res.end('{}');return;}response=aiStatus(env);}
   else{
    if(req.method!=='POST'){res.writeHead(405,cors);res.end('{}');return;}
    if(String(req.headers['content-type']||'').split(';')[0]!=='application/json'){res.writeHead(415,cors);res.end('{}');return;}
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>35000){res.writeHead(413,cors);res.end('{}');return;}chunks.push(chunk);}
    // nginx overwrites this header. Never trust client-provided Cloudflare headers.
    const actor=trustedProxy?req.headers['x-real-ip']:req.socket.remoteAddress;
    if(typeof actor!=='string'||actor.length>100){res.writeHead(503,cors);res.end('{}');return;}
    const request=new Request('http://localhost/api/meal-plan',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':actor},body:Buffer.concat(chunks)});
    response=await aiRoute(request,env,{fetcher});
   }
   res.writeHead(response.status,{...Object.fromEntries(response.headers),...cors});res.end(await response.text());
  }catch{res.writeHead(500,cors);res.end('{"error":"Сервис временно недоступен"}');}
 });
 server.requestTimeout=210000;server.headersTimeout=15000;return server;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const saltPath='/state/budget-salt';if(!existsSync(saltPath))writeFileSync(saltPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
 const key=readFileSync('/run/secrets/openai_key','utf8').trim();if(!key)throw Error('Existing Afita API key is empty');
 const DB=new SQLite('/state/menus.sqlite');repairBudgets(DB);
 const env={DB,OPENAI_API_KEY:key,AI_BUDGET_SALT:readFileSync(saltPath,'utf8'),AI_ENABLED:'true',OPENAI_MODEL:'gpt-4.1-mini',AI_DAY_REQUESTS:'20',AI_USER_DAY_REQUESTS:'5'};
 createServer(env).listen(8080,'0.0.0.0',()=>console.log('Afita meal service ready'));
}
