(function(){
  'use strict';
  var KEY='progress_v1';
  var D={lifts:[],tests:[],act:[],body:[],name:''};
  var BKEY='progress_v1_backup';
  var loadNote='';
  /* Загрузка: если в хранилище оказались повреждённые записи (например, после старой версии импорта),
     исходные данные сначала копируются в резервную копию, а на экран выводятся только корректные записи. */
  function load(){var raw=null;try{raw=localStorage.getItem(KEY)}catch(e){}
    if(!raw)return;var x;try{x=JSON.parse(raw)}catch(e){x=null}
    if(!x||typeof x!=='object'||Array.isArray(x)){keepLoadBackup(raw);loadNote='Сохранённые данные повреждены. Исходная версия сохранена в браузере резервной копией.';return}
    try{D=validate(x,false);return}catch(e){}
    var c=validate(x,true);keepLoadBackup(raw);D=c.data;
    loadNote='Часть сохранённых записей содержит недопустимые значения ('+c.skipped+') и скрыта. Исходная версия сохранена в браузере резервной копией.'}
  function readBackup(){try{var b=JSON.parse(localStorage.getItem(BKEY)||'null');return b&&typeof b.data==='string'?b:null}catch(e){return null}}
  /* при загрузке не затираем копию, сделанную пользователем перед импортом/удалением */
  function keepLoadBackup(raw){var b=readBackup();if(b&&b.reason!=='load'){try{localStorage.setItem(BKEY+'_load',raw)}catch(e){}return}keepBackup(raw,'load')}
  function keepBackup(rawJson,reason){try{localStorage.setItem(BKEY,JSON.stringify({at:new Date().toISOString(),reason:reason,data:rawJson}));return true}catch(e){return false}}

  /* ---- проверка данных: общая для ввода, загрузки и импорта ---- */
  var LIM={w:[0,500],r:[1,30],s:[1,20],srt:[0,10],chair:[0,60],steps:[0,60000],min:[0,2000],days:[0,7],waist:[30,250],hips:[30,250],weight:[25,300]};
  var MAXREC=5000;
  function isDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;var d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v&&v>='2000-01-01'&&v<='2100-12-31'}
  function inR(v,k,int){var a=LIM[k];return typeof v==='number'&&isFinite(v)&&v>=a[0]&&v<=a[1]&&(!int||Math.round(v)===v)}
  function opt(v,k,int){return v===null||v===undefined||inR(v,k,int)}
  function Bad(t){this.message=t}
  /* lenient=true — вернуть только корректные записи (для загрузки); иначе — ошибка на первой же неверной записи */
  function validate(x,lenient){
    if(!x||typeof x!=='object'||Array.isArray(x))throw new Bad('файл не похож на копию журнала');
    if(!Array.isArray(x.lifts)&&!lenient)throw new Bad('нет раздела «Силовые» (lifts)');
    var out={lifts:[],tests:[],act:[],body:[],name:''},skipped=0;
    var secs={lifts:'Силовые',tests:'Тесты',act:'Активность',body:'Замеры'};
    Object.keys(secs).forEach(function(k){
      var v=x[k];if(v===undefined){if(k==='lifts'&&!lenient)throw new Bad('нет раздела «Силовые»');return}
      if(!Array.isArray(v)){if(lenient){skipped++;return}throw new Bad('раздел «'+secs[k]+'» должен быть списком записей')}
      if(v.length>MAXREC&&!lenient)throw new Bad('в разделе «'+secs[k]+'» слишком много записей');
      var weeks={};
      v.forEach(function(r,i){var err=checkRec(k,r);
        if(!err&&k==='act'){if(weeks[r.week])err='неделя '+r.week+' повторяется';weeks[r.week]=1}
        if(err){if(lenient){skipped++;return}throw new Bad('«'+secs[k]+'», запись '+(i+1)+': '+err)}
        out[k].push(clean(k,r))});
    });
    if(x.name!==undefined&&x.name!==null){if(typeof x.name!=='string'||x.name.length>100){if(!lenient)throw new Bad('имя должно быть строкой до 100 символов')}else out.name=x.name}
    return lenient?{data:out,skipped:skipped}:out;
  }
  function checkRec(k,r){
    if(!r||typeof r!=='object'||Array.isArray(r))return 'запись должна быть объектом';
    if(k==='lifts'){
      if(!isDate(r.date))return 'неверная дата';
      if(typeof r.ex!=='string'||!r.ex.trim()||r.ex.length>100)return 'нет названия упражнения или оно длиннее 100 символов';
      if(!inR(r.w,'w')||r.w<=0)return 'вес — число больше 0 и не больше 500 кг';
      if(!inR(r.r,'r',1))return 'повторы — целое число от 1 до 30';
      if(!inR(r.s,'s',1))return 'подходы — целое число от 1 до 20';
    }else if(k==='tests'){
      if(!isDate(r.date))return 'неверная дата';
      if(!opt(r.srt,'srt'))return '«сесть-встать» — от 0 до 10';
      if(!opt(r.chair,'chair',1))return 'подъёмы со стула — целое число от 0 до 60';
      if(!(r.bal==null||r.bal===0||r.bal===1||r.bal===2))return 'баланс — 0, 1 или 2';
      if(r.srt==null&&r.chair==null&&r.bal==null)return 'пустая запись';
    }else if(k==='act'){
      if(!isDate(r.week))return 'неверная дата недели';
      if(!opt(r.steps,'steps'))return 'шаги — от 0 до 60 000 в день';
      if(!opt(r.min,'min'))return 'минуты силовых — от 0 до 2 000 в неделю';
      if(!opt(r.days,'days',1))return 'дни с силовыми — целое число от 0 до 7';
      if(r.steps==null&&r.min==null&&r.days==null)return 'пустая запись';
    }else{
      if(!isDate(r.date))return 'неверная дата';
      if(!opt(r.waist,'waist'))return 'талия — от 30 до 250 см';
      if(!opt(r.hips,'hips'))return 'бёдра — от 30 до 250 см';
      if(!opt(r.weight,'weight'))return 'вес — от 25 до 300 кг';
      if(r.waist==null&&r.hips==null&&r.weight==null)return 'пустая запись';
    }
    return '';
  }
  function nn(v){return v==null?null:v}
  function clean(k,r){
    if(k==='lifts')return {date:r.date,ex:r.ex.trim(),w:r.w,r:r.r,s:r.s};
    if(k==='tests')return {date:r.date,srt:nn(r.srt),chair:nn(r.chair),bal:nn(r.bal)};
    if(k==='act')return {week:r.week,steps:nn(r.steps),min:nn(r.min),days:nn(r.days)};
    return {date:r.date,waist:nn(r.waist),hips:nn(r.hips),weight:nn(r.weight)};
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(D));return true}catch(e){return false}}
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function today(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
  function r2(x){return Math.sign(x)*Math.round(Math.abs(x)*100+1e-9)/100}
  function f(x,dec){if(x==null||!isFinite(x))return '—';return r2(x).toFixed(dec==null?2:dec).replace('.',',').replace(/,00$/,'').replace(/(,\d)0$/,'$1')}
  function fd(iso){var p=iso.split('-');return p[2]+'.'+p[1]+'.'+p[0]}
  function num(id){var v=$(id).value.replace(',','.').trim();return v===''?null:+v}
  function pct(a,b){return a?((b-a)/a*100):null}
  /* Формулы: Эпли (1985) и Бжицки (1993) */
  function epley(w,r){return r===1?w:w*(1+r/30)}
  function brzycki(w,r){return r===1?w:(r<37?w*36/(37-r):null)}
  function e1rm(w,r){var a=epley(w,r),b=brzycki(w,r);return b==null?a:(a+b)/2}
  ['pDate','tDate','bDate'].forEach(function(id){if($(id))$(id).value=today()});

  /* ---- ввод ---- */
  function msg(id,t){$(id).textContent=t}
  $('pAdd').addEventListener('click',function(){
    var ex=$('pEx').value.trim(),w=num('pW'),r=num('pR'),s=num('pS'),dt=$('pDate').value||today();
    if(!ex){msg('pMsg','Укажите упражнение.');return}
    if(ex.length>100){msg('pMsg','Название упражнения — до 100 символов.');return}
    if(!isDate(dt)){msg('pMsg','Проверьте дату.');return}
    if(!(w>0&&w<=500)){msg('pMsg','Вес — от 0,5 до 500 кг. Для упражнений с собственным весом впишите 1.');return}
    if(!(r>=1&&r<=30&&Math.round(r)===r)){msg('pMsg','Повторы — целое число от 1 до 30.');return}
    if(!(s>=1&&s<=20&&Math.round(s)===s)){msg('pMsg','Подходы — целое число от 1 до 20.');return}
    D.lifts.push({date:dt,ex:ex,w:w,r:r,s:s});
    msg('pMsg',(save()?'Записано. ':'Не удалось сохранить в браузере. ')+'Расчётный максимум: '+f(e1rm(w,r),1)+' кг, тоннаж: '+f(w*r*s,0)+' кг.'+(r>10?' Точность формул ниже при повторах больше 10.':''));
    renderAll();
  });
  $('tAdd').addEventListener('click',function(){
    var srt=num('tSrt'),ch=num('tChair'),bal=$('tBal').value,dt=$('tDate').value||today();
    if(srt!==null&&!inR(srt,'srt')){msg('tMsg','«Сесть-встать» — от 0 до 10.');return}
    if(ch!==null&&!inR(ch,'chair',1)){msg('tMsg','Подъёмы со стула — от 0 до 60.');return}
    if(srt===null&&ch===null&&!bal){msg('tMsg','Заполните хотя бы один тест.');return}
    D.tests.push({date:dt,srt:srt,chair:ch,bal:bal===''?null:+bal});
    msg('tMsg',save()?'Результаты тестов записаны.':'Не удалось сохранить в браузере.');renderAll();
  });
  $('aAdd').addEventListener('click',function(){
    var st=num('aSteps'),m=num('aMin'),d=num('aDays'),wk=$('aWeek').value;
    if(!wk){msg('aMsg','Выберите неделю.');return}
    if(st===null&&m===null&&d===null){msg('aMsg','Заполните хотя бы одно поле.');return}
    if(!opt(st,'steps')){msg('aMsg','Шаги — среднее за день, от 0 до 60 000. Запись не сохранена.');return}
    if(!opt(m,'min')){msg('aMsg','Минуты силовых за неделю — от 0 до 2 000. Запись не сохранена.');return}
    if(!opt(d,'days',1)){msg('aMsg','Дней с силовыми — целое число от 0 до 7. Запись не сохранена.');return}
    if(d===0&&m>0){msg('aMsg','Указаны минуты силовых, но 0 дней с силовыми. Проверьте цифры — запись не сохранена.');return}
    D.act=D.act.filter(function(x){return x.week!==wk});
    D.act.push({week:wk,steps:st,min:m,days:d});D.act.sort(function(a,b){return a.week<b.week?-1:1});
    msg('aMsg',save()?'Неделя записана.':'Не удалось сохранить в браузере.');renderAll();
  });
  $('bAdd').addEventListener('click',function(){
    var w=num('bWaist'),h=num('bHips'),kg=num('bWeight'),dt=$('bDate').value||today();
    if(w===null&&h===null&&kg===null){msg('bMsg','Заполните хотя бы одно поле.');return}
    if(!opt(w,'waist')||!opt(h,'hips')){msg('bMsg','Обхваты — от 30 до 250 см. Замеры не сохранены.');return}
    if(!opt(kg,'weight')){msg('bMsg','Вес — от 25 до 300 кг. Замеры не сохранены.');return}
    D.body.push({date:dt,waist:w,hips:h,weight:kg});msg('bMsg',save()?'Замеры записаны.':'Не удалось сохранить в браузере.');renderAll();
  });
  (function(){var d=new Date(),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$('aWeek').value=d.toISOString().slice(0,10)})();

  /* ---- графики (SVG без библиотек) ---- */
  function line(series,unit,label){
    var all=[];series.forEach(function(s){s.pts.forEach(function(p){all.push(p)})});
    if(all.length<2)return '<p class="small">График появится после двух записей.</p>';
    var xs=all.map(function(p){return +new Date(p.x)}),ys=all.map(function(p){return p.y});
    var x0=Math.min.apply(0,xs),x1=Math.max.apply(0,xs),y0=Math.min.apply(0,ys),y1=Math.max.apply(0,ys);
    if(x1===x0)x1=x0+864e5;var pad=(y1-y0)*0.15||Math.max(1,y1*0.1);y0=Math.max(0,y0-pad);y1=y1+pad;
    var W=320,H=170,L=38,R=12,T=12,B=26;
    function X(t){return L+(t-x0)/(x1-x0)*(W-L-R)}function Y(v){return T+(1-(v-y0)/(y1-y0))*(H-T-B)}
    var g='';for(var i=0;i<=3;i++){var v=y0+(y1-y0)*i/3,yy=Y(v);g+='<line class="ch-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"/><text class="ch-t" x="'+(L-6)+'" y="'+(yy+4)+'" text-anchor="end">'+f(v,(y1-y0)<10?1:0)+'</text>'}
    var cls=['ch-a','ch-b','ch-c','ch-d'];
    var ls=series.map(function(s,k){var pts=s.pts.slice().sort(function(a,b){return a.x<b.x?-1:1});
      var d=pts.map(function(p,i){return (i?'L':'M')+X(+new Date(p.x)).toFixed(1)+' '+Y(p.y).toFixed(1)}).join(' ');
      var last=pts[pts.length-1];
      return '<path class="ch-line '+cls[k%4]+'" d="'+d+'"/>'+pts.map(function(p){return '<circle class="ch-dot '+cls[k%4]+'" cx="'+X(+new Date(p.x)).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="3.5"/>'}).join('')+
        '<text class="ch-v '+cls[k%4]+'" x="'+Math.min(W-R,X(+new Date(last.x))).toFixed(1)+'" y="'+(Y(last.y)-8).toFixed(1)+'" text-anchor="end">'+f(last.y,1)+'</text>'}).join('');
    var lg=series.length>1?'<div class="ch-legend">'+series.map(function(s,k){return '<span><i class="'+cls[k%4]+'"></i>'+esc(s.name)+'</span>'}).join('')+'</div>':'';
    return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+'">'+g+ls+
      '<text class="ch-t" x="'+L+'" y="'+(H-6)+'">'+fd(new Date(x0).toISOString().slice(0,10))+'</text><text class="ch-t" x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+fd(new Date(x1).toISOString().slice(0,10))+'</text>'+
      '<text class="ch-t" x="'+L+'" y="'+(T-2)+'">'+esc(unit)+'</text></svg>'+lg;
  }
  function bars(items,label){
    if(!items.length)return '';
    var W=320,H=160,L=8,B=24,T=22,mx=Math.max.apply(0,items.map(function(i){return i.y}).concat([7000]));
    var bw=Math.min(36,(W-2*L)/items.length-6),out='';
    items.forEach(function(it,i){var h=it.y/mx*(H-B-T),x=L+i*((W-2*L)/items.length)+3;out+='<rect class="'+(it.y>=7000?'ch-bar-ok':'ch-bar')+'" x="'+x.toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="4"/><text class="ch-t" x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+it.label+'</text>'});
    var y7=H-B-7000/mx*(H-B-T);
    return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+'">'+out+'<line class="ch-ref" x1="0" x2="'+W+'" y1="'+y7.toFixed(1)+'" y2="'+y7.toFixed(1)+'"/><text class="ch-t ch-reft" x="'+(W-2)+'" y="'+(y7-5).toFixed(1)+'" text-anchor="end">7 000 шагов</text></svg>';
  }

  /* ---- расчёты ---- */
  function liftStats(){
    var by={};D.lifts.forEach(function(l){(by[l.ex]=by[l.ex]||[]).push(l)});
    return Object.keys(by).map(function(ex){
      var a=by[ex].slice().sort(function(x,y){return x.date<y.date?-1:1});
      /* за день: лучший расчётный максимум и тоннаж всех записей — считаются независимо */
      var days={};a.forEach(function(l){var d=days[l.date]||(days[l.date]={e:-Infinity,ton:0});d.e=Math.max(d.e,e1rm(l.w,l.r));d.ton+=l.w*l.r*l.s});
      var pts=Object.keys(days).sort().map(function(d){return {x:d,y:days[d].e,ton:days[d].ton}});
      var first=pts[0],last=pts[pts.length-1],best=pts.reduce(function(m,p){return p.y>m.y?p:m},pts[0]);
      return {ex:ex,pts:pts,first:first,last:last,best:best,gain:pct(first.y,last.y),tgain:pct(first.ton,last.ton),n:a.length};
    }).sort(function(a,b){return b.n-a.n});
  }
  function series(arr,key){return arr.filter(function(x){return x[key]!=null}).map(function(x){return {x:x.date||x.week,y:x[key]}}).sort(function(a,b){return a.x<b.x?-1:1})}
  function fl(s){return s.length?{first:s[0],last:s[s.length-1]}:null}

  /* ---- экран ---- */
  function liftsHtml(forReport){
    var st=liftStats();if(!st.length)return '<p class="small">Пока нет записей силовых.</p>';
    var t='<div class="tbl-wrap"><table class="ptbl"><thead><tr><th>Упражнение</th><th>Старт, 1ПМ</th><th>Сейчас, 1ПМ</th><th>Лучший</th><th>Прирост</th><th>Тоннаж: изменение</th></tr></thead><tbody>'+
      st.map(function(s){return '<tr><td>'+esc(s.ex)+'</td><td>'+f(s.first.y,1)+' кг</td><td>'+f(s.last.y,1)+' кг</td><td>'+f(s.best.y,1)+' кг</td><td class="'+(s.gain>0?'up':'')+'">'+(s.pts.length>1?(s.gain>0?'+':'')+f(s.gain)+'%':'—')+'</td><td>'+(s.pts.length>1&&s.first.ton?(s.tgain>0?'+':'')+f(s.tgain)+'%':'—')+'</td></tr>'}).join('')+'</tbody></table></div>';
    var ch=st.slice(0,forReport?6:4).map(function(s){return '<figure class="chfig"><figcaption>'+esc(s.ex)+' — расчётный максимум на 1 повтор, кг</figcaption>'+line([{name:s.ex,pts:s.pts}],'кг','Динамика расчётного максимума: '+s.ex)+'</figure>'}).join('');
    return t+'<div class="chgrid">'+ch+'</div>';
  }
  function testsHtml(){
    var a=series(D.tests,'srt'),b=series(D.tests,'chair');
    if(!a.length&&!b.length&&!D.tests.length)return '<p class="small">Пока нет результатов тестов.</p>';
    var rows=[['«Сесть-встать», баллы из 10',fl(a)],['Подъёмы со стула за 30 с',fl(b)]].filter(function(r){return r[1]});
    var balT=D.tests.filter(function(x){return x.bal!=null});
    var t='<div class="tbl-wrap"><table class="ptbl"><thead><tr><th>Тест</th><th>Первый</th><th>Последний</th><th>Изменение</th></tr></thead><tbody>'+
      rows.map(function(r){var p=r[1];return '<tr><td>'+r[0]+'</td><td>'+f(p.first.y,1)+' ('+fd(p.first.x)+')</td><td>'+f(p.last.y,1)+' ('+fd(p.last.x)+')</td><td>'+(p.first.x!==p.last.x?((p.last.y-p.first.y)>0?'+':'')+f(p.last.y-p.first.y,1):'—')+'</td></tr>'}).join('')+
      (balT.length?'<tr><td>Баланс 10 с на одной ноге</td><td colspan="3">'+balT.slice(-3).map(function(x){return fd(x.date)+': '+['не получилось','одна нога','обе ноги'][x.bal]}).join(' · ')+'</td></tr>':'')+'</tbody></table></div>';
    var s=[];if(a.length)s.push({name:'Сесть-встать',pts:a});if(b.length)s.push({name:'Подъёмы со стула',pts:b});
    return t+(s.length?'<figure class="chfig"><figcaption>Динамика тестов</figcaption>'+line(s,'',"Динамика тестов")+'</figure>':'');
  }
  function actHtml(){
    if(!D.act.length)return '<p class="small">Пока нет записей активности.</p>';
    var last=D.act.slice(-8),withSteps=last.filter(function(x){return x.steps!=null});
    var avg=withSteps.length?withSteps.reduce(function(a,x){return a+x.steps},0)/withSteps.length:null;
    var okDays=last.filter(function(x){return x.days!=null&&x.days>=2}).length,okMin=last.filter(function(x){return x.min!=null&&x.min>=30}).length;
    var t='<div class="nums"><div><b>'+(avg==null?'—':f(avg,0))+'</b><span>шагов в день в среднем за последние '+withSteps.length+' нед.</span></div><div><b>'+okDays+' из '+last.length+'</b><span>недель с силовыми от 2 дней (ориентир ВОЗ)</span></div><div><b>'+okMin+' из '+last.length+'</b><span>недель с силовыми от 30 минут</span></div></div>';
    return t+'<figure class="chfig"><figcaption>Шаги в день по неделям</figcaption>'+bars(withSteps.map(function(x){return {y:x.steps,label:fd(x.week).slice(0,5)}}),'Шаги по неделям')+'</figure>';
  }
  function bodyHtml(){
    if(!D.body.length)return '<p class="small">Пока нет замеров.</p>';
    var rows=[['Талия, см','waist'],['Бёдра, см','hips'],['Вес, кг','weight']].map(function(r){return [r[0],fl(series(D.body,r[1])),r[1]]}).filter(function(r){return r[1]});
    var t='<div class="tbl-wrap"><table class="ptbl"><thead><tr><th>Замер</th><th>Первый</th><th>Последний</th><th>Разница</th></tr></thead><tbody>'+
      rows.map(function(r){var p=r[1],d=p.last.y-p.first.y;return '<tr><td>'+r[0]+'</td><td>'+f(p.first.y,1)+' ('+fd(p.first.x)+')</td><td>'+f(p.last.y,1)+' ('+fd(p.last.x)+')</td><td>'+(p.first.x!==p.last.x?(d>0?'+':'')+f(d,1):'—')+'</td></tr>'}).join('')+'</tbody></table></div>';
    var s=rows.filter(function(r){return r[2]!=='weight'}).map(function(r){return {name:r[0].split(',')[0],pts:series(D.body,r[2])}}).filter(function(s){return s.pts.length});
    return t+(s.length?'<figure class="chfig"><figcaption>Обхваты, см</figcaption>'+line(s,'см','Динамика обхватов')+'</figure>':'')+'<p class="small">Цифры — для наблюдения, а не для оценки. Сила, самочувствие и привычки важнее сантиметров и килограммов.</p>';
  }
  function logHtml(){
    var all=[];D.lifts.forEach(function(x,i){all.push({d:x.date,t:esc(x.ex)+': '+f(x.w,1)+' кг × '+x.r+' × '+x.s,k:'lifts',i:i})});
    D.tests.forEach(function(x,i){all.push({d:x.date,t:'Тесты'+(x.srt!=null?' · сесть-встать '+f(x.srt,1):'')+(x.chair!=null?' · стул '+x.chair:''),k:'tests',i:i})});
    D.act.forEach(function(x,i){all.push({d:x.week,t:'Неделя активности'+(x.steps!=null?' · '+f(x.steps,0)+' шагов/день':''),k:'act',i:i})});
    D.body.forEach(function(x,i){all.push({d:x.date,t:'Замеры',k:'body',i:i})});
    all.sort(function(a,b){return a.d<b.d?1:-1});
    if(!all.length)return '';
    return '<ul class="plog">'+all.slice(0,12).map(function(x){return '<li><span>'+fd(x.d)+' · '+x.t+'</span><button type="button" class="del" data-k="'+x.k+'" data-i="'+x.i+'" aria-label="Удалить запись">×</button></li>'}).join('')+'</ul>';
  }
  function renderAll(){
    $('vLifts').innerHTML=liftsHtml(false);$('vTests').innerHTML=testsHtml();$('vAct').innerHTML=actHtml();$('vBody').innerHTML=bodyHtml();$('vLog').innerHTML=logHtml();
    $('exList').innerHTML=Object.keys(D.lifts.reduce(function(m,l){m[l.ex]=1;return m},{})).concat(['Присед','Гоблет-присед','Румынская тяга','Становая тяга','Жим лёжа','Жим гантелей лёжа','Тяга верхнего блока','Тяга гантели в наклоне','Ягодичный мост','Жим ногами','Выпады назад','Жим гантелей стоя']).filter(function(v,i,a){return a.indexOf(v)===i}).map(function(e){return '<option value="'+esc(e)+'">'}).join('');
  }
  $('vLog').addEventListener('click',function(e){var b=e.target.closest('.del');if(!b)return;D[b.dataset.k].splice(+b.dataset.i,1);save();renderAll()});

  /* ---- отчёт и PDF ---- */
  $('pdfBtn').addEventListener('click',function(){
    var name=$('rName').value.trim();D.name=name;save();
    var dates=[].concat(D.lifts.map(function(x){return x.date}),D.tests.map(function(x){return x.date}),D.act.map(function(x){return x.week}),D.body.map(function(x){return x.date})).sort();
    if(!dates.length){msg('pdfMsg','Сначала добавьте хотя бы одну запись.');return}
    var inc=$('rBody').checked;
    $('report').innerHTML='<header class="r-head"><div><p class="r-brand">Алёна · Сила без перегибов · alenafit.com</p><h1>Отчёт о прогрессе'+(name?': '+esc(name):'')+'</h1><p>Период: '+fd(dates[0])+' — '+fd(dates[dates.length-1])+' · сформирован '+fd(today())+'</p></div></header>'+
      '<section><h2>Силовые</h2>'+liftsHtml(true)+'</section><section><h2>Функциональные тесты</h2>'+testsHtml()+'</section><section><h2>Активность</h2>'+actHtml()+'</section>'+(inc?'<section><h2>Замеры</h2>'+bodyHtml()+'</section>':'')+
      '<section class="r-notes"><h2>Как считали</h2><p>Расчётный максимум на 1 повтор (1ПМ) — среднее по формулам Эпли (1985): вес × (1 + повторы / 30) и Бжицки (1993): вес × 36 / (37 − повторы). Точнее всего при 1–10 повторах. Для каждой даты берётся лучший подход.</p><p>Тоннаж — сумма «вес × повторы × подходы» по всем записям упражнения за день. Прирост — (последнее − первое) / первое × 100%, округление до сотых.</p><p>Ориентиры: ВОЗ — силовые от 2 дней в неделю; 7 000 шагов в день — обзор Ding et al., The Lancet Public Health, 2025. Тест «сесть-встать» — Araújo et al., 2025.</p><p>Отчёт не является медицинским документом.</p></section>';
    msg('pdfMsg','В окне печати выберите «Сохранить как PDF».');
    setTimeout(function(){window.print()},50);
  });
  /* ---- резервная копия ---- */
  $('expBtn').addEventListener('click',function(){
    var blob=new Blob([JSON.stringify(D,null,1)],{type:'application/json'});var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='progress-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
    msg('bkMsg','Файл с копией сохранён в загрузки.');
  });
  function counts(d){return 'силовые — '+d.lifts.length+', тесты — '+d.tests.length+', активность — '+d.act.length+', замеры — '+d.body.length}
  function backupUi(){var b=readBackup(),box=$('bkRestore');if(!box)return;
    if(!b){box.hidden=true;return}
    var when=new Date(b.at),label={'import':'до импорта','wipe':'до удаления','restore':'до возврата копии','load':'исходная версия с ошибками'}[b.reason]||'';
    $('bkInfo').textContent='Резервная копия '+label+' от '+(isNaN(when)?'—':when.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}))+'.';
    $('bkBack').hidden=b.reason==='load';box.hidden=false}
  $('impFile').addEventListener('change',function(){var inp=this,fl=inp.files[0];if(!fl)return;
    var fail=function(t){inp.value='';msg('bkMsg','Файл не принят: '+t+'. Ваши текущие данные не изменены.')};
    if(fl.size>5e6){fail('файл слишком большой');return}
    var rd=new FileReader();
    rd.onerror=function(){fail('не удалось прочитать файл')};
    rd.onload=function(){
      var x,clean;
      try{x=JSON.parse(rd.result)}catch(e){fail('это не файл копии журнала (повреждённый JSON)');return}
      try{clean=validate(x,false)}catch(e){fail(e instanceof Bad?e.message:'неизвестная ошибка проверки');return}
      if(!window.confirm('Импорт заменит текущие записи.\n\nСейчас: '+counts(D)+'.\nВ файле: '+counts(clean)+'.\n\nТекущие данные сохранятся резервной копией — их можно вернуть кнопкой «Вернуть предыдущие данные». Продолжить?')){inp.value='';msg('bkMsg','Импорт отменён. Данные не изменены.');return}
      var prev=JSON.stringify(D);
      if(!keepBackup(prev,'import')){fail('браузер не дал сохранить резервную копию текущих данных');return}
      D=clean;
      if(!save()){D=JSON.parse(prev);try{localStorage.setItem(KEY,prev)}catch(e){}fail('браузер не дал сохранить данные');return}
      try{renderAll()}catch(e){D=JSON.parse(prev);try{localStorage.setItem(KEY,prev)}catch(e2){}renderAll();fail('не удалось показать данные');return}
      inp.value='';if(D.name)$('rName').value=D.name;backupUi();
      msg('bkMsg','Данные восстановлены из файла: '+counts(D)+'. Предыдущие данные сохранены — их можно вернуть.');
    };
    rd.readAsText(fl)});
  $('bkBack').addEventListener('click',function(){var b=readBackup();if(!b)return;var x;
    try{x=validate(JSON.parse(b.data),false)}catch(e){msg('bkMsg','Резервная копия повреждена, вернуть её нельзя. Текущие данные не изменены.');return}
    if(!window.confirm('Вернуть данные из резервной копии ('+counts(x)+')?\nТекущие данные ('+counts(D)+') станут новой резервной копией.'))return;
    var cur=JSON.stringify(D);if(!keepBackup(cur,'restore')){msg('bkMsg','Браузер не дал сохранить копию текущих данных. Ничего не изменено.');return}
    D=x;if(!save()){D=JSON.parse(cur);msg('bkMsg','Не удалось сохранить. Ничего не изменено.');return}
    $('rName').value=D.name||'';renderAll();backupUi();msg('bkMsg','Предыдущие данные возвращены.')});
  $('bkDl').addEventListener('click',function(){var b=readBackup();if(!b)return;
    var blob=new Blob([b.data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='progress-backup-'+String(b.at).slice(0,10)+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)});
  var wipe=$('wipeBtn'),armed=false;
  wipe.addEventListener('click',function(){if(!armed){armed=true;wipe.textContent='Точно удалить всё? Нажмите ещё раз';setTimeout(function(){armed=false;wipe.textContent='Удалить все данные'},4000);return}
    var had=D.lifts.length+D.tests.length+D.act.length+D.body.length;if(had)keepBackup(JSON.stringify(D),'wipe');
    D={lifts:[],tests:[],act:[],body:[],name:''};try{localStorage.removeItem(KEY)}catch(e){}armed=false;wipe.textContent='Удалить все данные';renderAll();backupUi();msg('bkMsg','Все данные удалены.'+(had?' Если это ошибка — нажмите «Вернуть предыдущие данные».':''))});
  load();if(D.name)$('rName').value=D.name;renderAll();backupUi();if(loadNote)msg('bkMsg',loadNote);
})();
