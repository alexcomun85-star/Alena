const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {body,profile}=require('./ai_meal_contract.test.cjs');
const C=require('../js/ai-meal-contract.js');
let mode='pending',ids=[],count=0;
const context={window:{FOOD_DB:global.FOOD_DB,AfitaAIContract:C,AfitaTargets:global.AfitaTargets},crypto:require('node:crypto').webcrypto,AbortSignal,setTimeout:fn=>setTimeout(fn,0),clearTimeout,fetch:async(url,init)=>{
 const req=JSON.parse(init.body);ids.push(req.requestId);count++;
 if(mode==='interrupted'){mode='success';return Response.json({code:'interrupted',error:'Прерванный запрос'},{status:410});}
 if(mode==='pending'){mode='success';return Response.json({code:'in_progress'},{status:409});}
 return Response.json({kind:'ai',version:1,requestId:req.requestId,body,model:'test',generatedAt:'2026-10-30T12:00:00Z'});
}};
vm.runInNewContext(fs.readFileSync('js/ai-meal-client.js','utf8'),context);
(async()=>{
 const A=context.window.AfitaAI;
 const plan=await A.generate(profile,'test');assert.equal(plan.days.length,7);assert.equal(count,2);assert.equal(ids[0],ids[1],'poll same request ID; no extra generation');
 mode='interrupted';await assert.rejects(A.generate(profile,'second'),/Прерванный/);const old=ids.at(-1);await A.generate(profile,'second');assert.notEqual(ids.at(-1),old,'explicit retry gets a new ID after interrupted request');
 console.log('Client pending: automatic polling of same ID, bounded wait, interrupted retry creates a fresh ID OK');
})().catch(e=>{console.error(e);process.exitCode=1});
