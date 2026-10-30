/* Working estimates for healthy adults; population references are not prescriptions. */
(function(root){'use strict';
const sources=[
 ['Миффлин — Сан Жеор: расход в покое','https://pubmed.ncbi.nlm.nih.gov/2305711/'],
 ['FAO/WHO/UNU: физическая активность','https://www.fao.org/4/Y5686e/y5686e07.htm'],
 ['EFSA: белок взрослых','https://www.efsa.europa.eu/en/press/news/120209'],
 ['ISSN: белок при тренировках','https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/'],
 ['ISSN: безжировая масса на дефиците','https://pmc.ncbi.nlm.nih.gov/articles/PMC6090881/'],
 ['EFSA: жиры, 20–35% энергии','https://doi.org/10.2903/j.efsa.2010.1461'],
 ['EFSA: углеводы, 45–60% энергии','https://doi.org/10.2903/j.efsa.2010.1462'],
 ['NICE: низкоэнергетические рационы','https://www.nice.org.uk/guidance/ng246/chapter/Physical-activity-and-diet']
];
function number(v){return v===''||v==null?NaN:Number(v)}
function checkTarget(k){if(!Number.isFinite(k)||k<=0||k>5000)throw Error('Укажите калорийность больше нуля и не выше 5000 ккал.');if(k<=1200)throw Error('Рационы 1200 ккал и ниже здесь автоматически не составляются: для них нужны индивидуальная оценка и контроль полноценности питания. Это не универсальная граница вашей потребности.');return k}
function calculate(input){const d={...input},notes=[];let k,rest=null,maintenance=null,weight=number(d.weight),bmi=null;
 if(!['lose','maintain','gain'].includes(d.goal))throw Error('Выберите цель.');
 if(d.mode==='auto'){
  const age=number(d.age),height=number(d.height),activity=number(d.activity);
  if(!Number.isFinite(age)||age<19||age>78)throw Error('Автооценка по этой формуле доступна для 19–78 лет. Для другого возраста укажите согласованную норму вручную.');
  if(!Number.isFinite(height)||height<120||height>230||!Number.isFinite(weight)||weight<30||weight>250)throw Error('Проверьте рост (120–230 см) и вес (30–250 кг).');
  if(!['female','male'].includes(d.sex)||![1.4,1.6,1.8].includes(activity))throw Error('Выберите пол для формулы и обычную активность.');
  bmi=weight/(height/100)**2;if(bmi<18.5&&d.goal==='lose')throw Error('При таком соотношении роста и веса автоматический дефицит не предлагается. Выберите поддержание и обсудите цель со специалистом.');
  rest=10*weight+6.25*height-5*age+(d.sex==='male'?5:-161);maintenance=rest*activity;
  const adjustment=d.goal==='lose'?.9:d.goal==='gain'?1.05:1;k=Math.round(maintenance*adjustment/10)*10;
  notes.push('Расход в покое: '+Math.round(rest)+' ккал; с выбранной активностью: около '+Math.round(maintenance)+' ккал/день.');
  if(d.goal!=='maintain')notes.push(d.goal==='lose'?'Для первого приближения выбран дефицит 10%. Это настройка сервиса, не универсальное назначение.':'Для первого приближения выбрана прибавка 5%. Это настройка сервиса, не универсальное назначение.');
  notes.push('Формула оценивает расход, а не измеряет его. Уточняйте цель по самочувствию и средней динамике веса за несколько недель.');
 }else{k=number(d.target)}
 checkTarget(k);
 let p,method='Доля энергии',fatShare=d.fatShare===''||d.fatShare==null?30:number(d.fatShare);if(!Number.isFinite(fatShare)||fatShare<20||fatShare>35)throw Error('Для обычного шаблона выберите долю жиров от 20 до 35%.');
 if(d.protein!==''&&d.protein!=null){p=number(d.protein);method='Ваша цель белка';if(!Number.isFinite(p)||p<=0||p>300)throw Error('Проверьте белок: больше нуля и не выше 300 г.');}
 else if(d.proteinBasis==='ffm'){
  const bf=number(d.bodyFat);if(d.mode!=='auto'||d.goal!=='lose'||!d.strength)throw Error('Расчёт по безжировой массе предназначен для силовых тренировок на дефиците. Подтвердите этот режим или используйте обычный расчёт.');
  if(!Number.isFinite(bf)||bf<5||bf>60)throw Error('Укажите известный процент жира (5–60%). Афита не оценивает его по росту и весу.');
  const ffm=weight*(1-bf/100);p=ffm*2.3;method='2,3 г × '+ffm.toFixed(1)+' кг безжировой массы';notes.push('Безжировая масса = вес × (1 − доля жира). Выбран нижний ориентир диапазона ISSN 2,3–3,1 г/кг БЖМ для силовых спортсменов на дефиците, не для всех взрослых. Погрешность измерения жира переносится в расчёт.');
 }else if(d.mode==='auto'&&bmi<30){const active=number(d.activity)>1.4||d.strength===true;const coefficient=active?1.6:0.83;p=active?weight*coefficient:Math.max(weight*.83,k*.20/4);method=active?coefficient+' г × '+weight+' кг общей массы':'Шаблон 20% энергии на белок, не ниже 0,83 г/кг';notes.push(active?'Для тренирующихся выбран рабочий ориентир 1,6 г/кг внутри диапазона ISSN 1,4–2,0. Активность и потребности могут различаться.':'EFSA 0,83 г/кг — популяционный ориентир потребности, а не верхний предел. Для подбора обычного меню выбрана рабочая доля белка 20% энергии, не ниже этого ориентира; это настройка сервиса, не отдельная медицинская норма.');}
 else{p=k*.20/4;notes.push('Без индивидуальной белковой цели используется шаблон: 20% энергии на белок, '+fatShare+'% на жиры, остальное на углеводы. Это настройка меню, а не персональная физиологическая норма.');if(bmi>=30)notes.push('При ИМТ от 30 расчёт белка по общей массе может быть неподходящим. Проверьте белковую цель со специалистом; здесь используется доля энергии.');}
 p=Math.round(p);const f=Math.round(k*fatShare/900),c=Math.round((k-4*p-9*f)/4);
 if(c<50||4*p/k>.40)throw Error('Выбранные калории и белок оставляют слишком мало энергии другим компонентам. Проверьте калорийность и белковую цель, а не сокращайте жиры автоматически.');
 const carbShare=4*c/k*100;if(carbShare<45||carbShare>60)notes.push('Доля углеводов '+Math.round(carbShare)+'% выходит за популяционный ориентир EFSA 45–60%. Это не доказательство вреда, но такой баланс требует индивидуальной проверки.');
 notes.push('Жиры: '+fatShare+'% энергии; углеводы — остаток после белка и жиров. Значения округлены.');
 return {k,p,f,c,method,notes,rest,maintenance,bmi,macroEnergy:p*4+f*9+c*4};
}
root.AfitaTargets={calculate,checkTarget,sources};if(typeof module!=='undefined'&&module.exports)module.exports=root.AfitaTargets;
})(typeof window!=='undefined'?window:globalThis);
