// Adjust quantities of existing ingredients only. No new foods or recipes are added.
import './contract.js';
const C=globalThis.AfitaAIContract;
function bounds(name,row,g,meal){
 if(name==='Яйцо куриное')return [g,g,50]; // Preserve egg counts and cooking instructions.
 const core=['pancakes','bake'].includes(meal.family)&&!['Фрукты и ягоды','Овощи и грибы'].includes(row[5]);
 if(core)return [g,g,5]; // Keep batter and baked dish ratios intact.
 if(/Лук|чеснок|Сахар|Мёд|Кетчуп|Майонез/.test(name))return [g,g,5];
 if(/^Масло/.test(name))return [Math.max(1,Math.ceil(g*.6)),Math.max(g,Math.min(20,Math.floor(g*1.5))),1];
 if(row[5]==='Крупы и гарниры')return [Math.ceil(g*.7/5)*5,Math.max(g,Math.min(/сух|хлопья/.test(name)?100:350,Math.floor(g*2.5/5)*5)),5];
 if(row[5]==='Хлеб и выпечка')return [Math.ceil(g*.7/5)*5,Math.max(g,Math.min(120,Math.floor(g*2/5)*5)),5];
 if(['Фрукты и ягоды','Овощи и грибы'].includes(row[5]))return [Math.ceil(g*.8/5)*5,Math.max(g,Math.min(300,Math.floor(g*2.5/5)*5)),5];
 if(/Сыр |орех|Миндаль|Арахис|Семечки|Шоколад/.test(name))return [Math.max(5,Math.ceil(g*.7/5)*5),Math.max(g,Math.min(60,Math.floor(g*1.25/5)*5)),5];
 if(row[2]>=7)return [Math.max(20,Math.ceil(g*.6/5)*5),Math.max(g,Math.min(row[5]==='Молочные'?250:180,Math.floor(g*1.15/5)*5)),5];
 return [Math.ceil(g*.8/5)*5,Math.max(g,Math.min(300,Math.floor(g*1.3/5)*5)),5];
}
export function balanceMenu(body,req,db){
 const initial=C.normalize(body,req,db,{strict:false});if(!initial.errors.length)return body;
 const output=structuredClone(body),map=new Map(db.map(r=>[r[0],r]));
 for(let di=0;di<initial.days.length;di++){
  if(!C.quality([initial.days[di]],req.targets).length)continue;
  const day=initial.days[di],vars=[],masses=day.meals.map(m=>m.parts.reduce((s,p)=>s+p[1],0));
  day.meals.forEach((meal,mi)=>meal.parts.forEach(([name,g],pi)=>{
   const row=map.get(name),plant=C.produce([{parts:[[name,100]]}],db).g===100;
   const [lo,hi,step]=req.action==='replace'&&mi!==req.index?[g,g,5]:bounds(name,row,g,meal);
   vars.push({mi,pi,name,g,base:g,row,plant,lo:Math.min(g,lo),hi:Math.max(g,hi),step});
  }));
  function score(){
   const t={k:0,p:0,f:0,c:0};let plant=0,change=0;
   for(const v of vars){['k','p','f','c'].forEach((key,i)=>t[key]+=v.row[i+1]*v.g/100);if(v.plant)plant+=v.g;change+=Math.log(v.g/v.base)**2;}
   return ['k','p','f','c'].reduce((s,k)=>s+(k==='k'?6:2)*((t[k]-req.targets[k])/req.targets[k])**2,0)+(plant<400?1+10*((400-plant)/400)**2:0)+.003*change;
  }
  let best=score();
  for(let pass=0;pass<10;pass++){
   let moved=false;
   for(const v of vars){const original=v.g,cap=v.mi===2?450:v.mi===0?650:750;let selected=original,localBest=best;
    const candidates=new Set([original,v.base,v.lo,v.hi]);for(let g=Math.ceil(v.lo/v.step)*v.step;g<=v.hi;g+=v.step)candidates.add(g);
    for(const g of candidates){if(g<1||g>500||masses[v.mi]-original+g>cap)continue;v.g=g;const value=score();if(value<localBest-1e-10){localBest=value;selected=g;}}
    v.g=selected;masses[v.mi]+=selected-original;if(selected!==original)moved=true;best=localBest;
   }
   if(!moved)break;
  }
  if(req.action==='replace'){const parts=vars.filter(v=>v.mi===req.index).map(v=>({food:v.name,grams:v.g}));output.meals[0].parts=parts;}
  else for(let mi=0;mi<4;mi++)output.days[di].meals[mi].parts=vars.filter(v=>v.mi===mi).map(v=>({food:v.name,grams:v.g}));
 }
 // Caller repeats the full strict validation, including exclusions and portion sizes.
 return output;
}
