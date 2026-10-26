/* Калькулятор еды: калории и БЖУ без дневной нормы. Данные — только в браузере. */
(function(){
  'use strict';
  var KEY='food_v1',S={custom:[],days:{}};
  function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&typeof x==='object')S=Object.assign(S,x)}catch(e){}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch(e){return false}}
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function r1(x){return Math.round((x+Number.EPSILON)*10)/10}
  function f(x,d){if(x==null||!isFinite(x))return '—';return (d===0?Math.round(x):r1(x)).toString().replace('.',',')}
  function today(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
  function n(v){v=String(v==null?'':v).replace(',','.').trim();return v===''?null:+v}
  function atwater(p,fa,c){return p*4+fa*9+c*4}
  /* Проверка пищевой ценности на 100 г.
     Б, Ж, У — конечные числа от 0 до 100; сумма не больше 100 г + 1,5 г допуска
     (на этикетке каждое из трёх значений может быть округлено до целого — до 0,5 г вверх).
     Калории — от 0 до 910 (чистый жир по Этуотеру — 900 ккал, плюс округление).
     Расхождение калорий с формулой 4–9–4 — только предупреждение: справочники и этикетки
     используют свои коэффициенты и по-разному учитывают клетчатку. Исходные цифры не меняем. */
  var SUM_TOL=1.5,KMAX=910;
  function checkFood(k,p,fa,c){
    var bad=function(v){return v!=null&&!(typeof v==='number'&&isFinite(v)&&v>=0&&v<=100)};
    if(bad(p)||bad(fa)||bad(c))return {err:'Белки, жиры и углеводы — числа от 0 до 100 г на 100 г продукта, без минуса.'};
    var sum=(p||0)+(fa||0)+(c||0);
    if(sum>100+SUM_TOL)return {err:'Белки + жиры + углеводы = '+f(sum)+' г, а в 100 г продукта не может быть больше 100 г. Проверьте, что цифры указаны на 100 г, а не на упаковку или порцию.'};
    if(k!=null&&!(typeof k==='number'&&isFinite(k)&&k>=0&&k<=KMAX))return {err:'Калории — от 0 до 900 на 100 г, без минуса.'};
    var warn='';
    if(k!=null&&p!=null&&fa!=null&&c!=null){var a=atwater(p,fa,c),d=Math.abs(k-a);
      if(d>Math.max(25,0.2*Math.max(k,a)))warn='Калории заметно отличаются от расчёта по БЖУ (≈ '+f(a,0)+' ккал). Так бывает из-за клетчатки, сахарозаменителей или особых коэффициентов, но стоит сверить с этикеткой.'}
    return {err:'',warn:warn};
  }
  var MEALS=['Завтрак','Обед','Ужин','Перекус'];
  var META=window.FOOD_META||{};
  var DB=(window.FOOD_DB||[]).map(function(r,i){var m=META[r[0]]||[];return {id:'b'+i,name:r[0],k:r[1],p:r[2],f:r[3],c:r[4],cat:r[5],src:r[6],pg:r[7],pl:r[8],st:m[0]||'',fdc:m[1]||''}});
  function all(){return S.custom.map(function(c){return Object.assign({src:c.src0||'C',cat:'Мои продукты'},c)}).concat(DB)}
  var sel=null,date=today();
  $('fDate').value=date;$('fDate').max=today();

  /* ---- поиск по списку ---- */
  var q=$('fQ'),res=$('fRes');
  function norm(s){return s.toLowerCase().replace(/ё/g,'е')}
  function showRes(){
    var t=norm(q.value.trim());
    var list=all().filter(function(x){return !t||norm(x.name).indexOf(t)>=0});
    if(t)list.sort(function(a,b){var ia=norm(a.name).indexOf(t),ib=norm(b.name).indexOf(t);return (ia===0?0:1)-(ib===0?0:1)||ia-ib});
    if(!t){var cats={};list=list.filter(function(x){if(x.src==='C')return true;cats[x.cat]=(cats[x.cat]||0)+1;return false})}
    var html=list.slice(0,40).map(function(x){return '<button type="button" class="fr" data-id="'+x.id+'"><span>'+esc(x.name)+(x.src==='D'||x.src==='L'?' <i title="ориентировочно">≈</i>':'')+'</span><small>'+f(x.k,0)+' ккал · Б '+f(x.p)+'</small></button>'}).join('');
    if(!t&&!S.custom.length)html='<p class="small">Начните вводить название: «гречка», «творог», «яблоко»…</p>';
    else if(t&&!list.length)html='<p class="small">Такого продукта нет в списке. Добавьте его ниже или найдите в базе Open Food Facts.</p>';
    res.innerHTML=html;
  }
  q.addEventListener('input',showRes);
  res.addEventListener('click',function(e){var b=e.target.closest('.fr');if(!b)return;pick(b.dataset.id)});
  function pick(id){
    sel=all().find(function(x){return x.id===id});if(!sel)return;
    $('fSel').hidden=false;$('fSelName').textContent=sel.name;
    $('fSelInfo').innerHTML='На 100 г'+(sel.st?' ('+esc(sel.st)+')':'')+': '+f(sel.k,0)+' ккал · Б '+f(sel.p)+' · Ж '+f(sel.f)+' · У '+f(sel.c)+(sel.src==='D'?' · домашнее блюдо, значения ориентировочные':sel.src==='L'?' · типичные значения с этикеток, сверяйте со своей упаковкой':sel.src==='O'?' · данные Open Food Facts':sel.fdc?' · <a href="https://fdc.nal.usda.gov/food-details/'+sel.fdc+'/nutrients" target="_blank" rel="noopener">USDA FDC '+sel.fdc+'</a>':sel.src==='U'?' · по USDA, сводное значение':'');
    $('fG').value=sel.pg||100;
    $('fPortions').innerHTML=(sel.pg?'<button type="button" class="chipbtn" data-g="'+sel.pg+'">'+esc(sel.pl||'порция')+' · '+sel.pg+' г</button>':'')+[50,100,150,200].map(function(g){return '<button type="button" class="chipbtn" data-g="'+g+'">'+g+' г</button>'}).join('');
    calcSel();$('fG').focus();
  }
  $('fPortions').addEventListener('click',function(e){var b=e.target.closest('.chipbtn');if(!b)return;$('fG').value=b.dataset.g;calcSel()});
  function calcSel(){if(!sel)return;var g=n($('fG').value)||0,m=g/100;$('fSelCalc').textContent=g?f(sel.k*m,0)+' ккал · Б '+f(sel.p*m)+' г · Ж '+f(sel.f*m)+' г · У '+f(sel.c*m)+' г':''}
  $('fG').addEventListener('input',calcSel);
  $('fAdd').addEventListener('click',function(){
    if(!sel){$('fMsg').textContent='Выберите продукт из списка.';return}
    var g=n($('fG').value);if(!(g>0&&g<=3000)){$('fMsg').textContent='Укажите вес от 1 до 3000 г.';return}
    var m=g/100,meal=$('fMeal').value;
    (S.days[date]=S.days[date]||[]).push({name:sel.name,g:g,meal:meal,k:sel.k*m,p:sel.p*m,f:sel.f*m,c:sel.c*m});
    $('fMsg').textContent=save()?'Добавлено: '+sel.name+', '+f(g,0)+' г.':'Не удалось сохранить: браузер запрещает хранение данных.';
    q.value='';showRes();$('fSel').hidden=true;sel=null;render();
  });

  /* ---- свой продукт ---- */
  ['cK','cP','cF','cC'].forEach(function(id){$(id).addEventListener('input',hint)});
  function hint(){var p=n($('cP').value),fa=n($('cF').value),c=n($('cC').value),ck=checkFood(n($('cK').value),p,fa,c);
    if(ck.err||ck.warn){$('cHint').textContent=ck.err||ck.warn;return}
    $('cHint').textContent=(p!=null&&fa!=null&&c!=null)?'По БЖУ получается ≈ '+f(atwater(p,fa,c),0)+' ккал на 100 г (коэффициенты Этуотера: белки и углеводы — 4, жиры — 9 ккал/г).':'Если калорий нет на упаковке, оставьте поле пустым — посчитаю по белкам, жирам и углеводам.'}
  hint();
  $('cAdd').addEventListener('click',function(){
    var name=$('cName').value.trim(),k=n($('cK').value),p0=n($('cP').value),f0=n($('cF').value),c0=n($('cC').value);
    if(!name){$('cMsg').textContent='Укажите название.';return}
    if(name.length>100){$('cMsg').textContent='Название — до 100 символов.';return}
    var ck=checkFood(k,p0,f0,c0);if(ck.err){$('cMsg').textContent=ck.err+' Продукт не сохранён.';return}
    var p=p0||0,fa=f0||0,c=c0||0;
    if(k==null){if(!(p||fa||c)){$('cMsg').textContent='Укажите калории или хотя бы белки, жиры и углеводы.';return}k=atwater(p,fa,c)}
    var item={id:'c'+Date.now(),name:name,k:k,p:p,f:fa,c:c,pg:100,pl:'100 г'};S.custom.unshift(item);save();
    ['cName','cK','cP','cF','cC'].forEach(function(id){$(id).value=''});hint();
    $('cMsg').textContent='Продукт «'+name+'» сохранён в «Мои продукты».'+(ck.warn?' '+ck.warn:'');pick(item.id);showRes();
  });

  /* ---- Open Food Facts ---- */
  function offNum(o,k){var v=o&&o[k];return v==null||v===''?null:+v}
  function offItem(p){var nu=p.nutriments||{};var k=offNum(nu,'energy-kcal_100g');if(k==null&&offNum(nu,'energy_100g')!=null)k=offNum(nu,'energy_100g')/4.184;
    var pr=offNum(nu,'proteins_100g'),fa=offNum(nu,'fat_100g'),ca=offNum(nu,'carbohydrates_100g');
    if(k==null&&pr!=null&&fa!=null&&ca!=null)k=atwater(pr,fa,ca);
    var name=(p.product_name_ru||p.product_name||'').trim();if(p.brands)name+=' ('+String(p.brands).split(',')[0].trim()+')';
    if(k==null||!name||checkFood(k,pr,fa,ca).err)return null;
    return {name:name,k:k,p:pr||0,f:fa||0,c:ca||0,code:p.code||''}}
  var offRes=[];
  $('oBtn').addEventListener('click',function(){
    var t=$('oQ').value.trim();if(!t){$('oMsg').textContent='Введите название или штрихкод.';return}
    var isCode=/^\d{8,14}$/.test(t),F='code,product_name,product_name_ru,brands,nutriments';
    var url=isCode?'https://world.openfoodfacts.org/api/v2/product/'+t+'.json?fields='+F:'https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(t)+'&search_simple=1&action=process&json=1&page_size=12&fields='+F;
    $('oMsg').textContent='Ищу в Open Food Facts…';$('oRes').innerHTML='';
    var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){ctl&&ctl.abort()},12000);
    fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){return r.json()}).then(function(j){clearTimeout(tm);
      var arr=isCode?(j&&j.product?[j.product]:[]):((j&&j.products)||[]);
      offRes=arr.map(offItem).filter(Boolean);
      if(!offRes.length){$('oMsg').textContent='Ничего не нашлось с корректной пищевой ценностью. Попробуйте другое название или внесите продукт вручную по этикетке.';return}
      $('oMsg').textContent='Нашлось: '+offRes.length+'. Проверьте цифры по своей упаковке — базу заполняют пользователи.';
      $('oRes').innerHTML=offRes.map(function(x,i){return '<button type="button" class="fr" data-i="'+i+'"><span>'+esc(x.name)+'</span><small>'+f(x.k,0)+' ккал · Б '+f(x.p)+' · Ж '+f(x.f)+' · У '+f(x.c)+'</small></button>'}).join('');
    }).catch(function(){clearTimeout(tm);$('oMsg').textContent='База Open Food Facts сейчас не отвечает. Попробуйте позже или внесите продукт вручную по этикетке.'});
  });
  $('oRes').addEventListener('click',function(e){var b=e.target.closest('.fr');if(!b)return;var x=offRes[+b.dataset.i];
    var item={id:'c'+Date.now(),name:x.name,k:x.k,p:x.p,f:x.f,c:x.c,pg:100,pl:'100 г',src0:'O'};S.custom.unshift(item);save();
    $('oMsg').textContent='«'+x.name+'» сохранён в «Мои продукты».';pick(item.id);location.hash='#dobavit';});

  /* ---- день ---- */
  $('fDate').addEventListener('change',function(){date=this.value||today();render()});
  function render(){
    var list=S.days[date]||[],tot={k:0,p:0,f:0,c:0};
    list.forEach(function(x){tot.k+=x.k;tot.p+=x.p;tot.f+=x.f;tot.c+=x.c});
    $('dTot').innerHTML='<div><b>'+f(tot.k,0)+'</b><span>ккал</span></div><div><b>'+f(tot.p)+'</b><span>белки, г</span></div><div><b>'+f(tot.f)+'</b><span>жиры, г</span></div><div><b>'+f(tot.c)+'</b><span>углеводы, г</span></div>';
    var e=tot.p*4+tot.f*9+tot.c*4;
    $('dBar').innerHTML=e?'<div class="mbar"><i class="mb-p" style="width:'+(tot.p*4/e*100)+'%"></i><i class="mb-f" style="width:'+(tot.f*9/e*100)+'%"></i><i class="mb-c" style="width:'+(tot.c*4/e*100)+'%"></i></div><p class="small">Доля калорий: белки '+f(tot.p*4/e*100,0)+'% · жиры '+f(tot.f*9/e*100,0)+'% · углеводы '+f(tot.c*4/e*100,0)+'%</p>':'';
    $('dList').innerHTML=list.length?MEALS.map(function(m){var it=list.map(function(x,i){return {x:x,i:i}}).filter(function(o){return o.x.meal===m});if(!it.length)return '';
      var mk=it.reduce(function(a,o){return a+o.x.k},0);
      return '<div class="meal"><h3>'+m+' <span>'+f(mk,0)+' ккал</span></h3><ul>'+it.map(function(o){return '<li><span>'+esc(o.x.name)+', '+f(o.x.g,0)+' г</span><span>'+f(o.x.k,0)+' ккал · Б '+f(o.x.p)+'</span><button type="button" class="del" data-i="'+o.i+'" aria-label="Удалить">×</button></li>'}).join('')+'</ul></div>'}).join(''):'<p class="small">За этот день записей нет.</p>';
  }
  $('dList').addEventListener('click',function(e){var b=e.target.closest('.del');if(!b)return;(S.days[date]||[]).splice(+b.dataset.i,1);save();render()});
  var w=$('fWipe'),armed=false;
  w.addEventListener('click',function(){if(!armed){armed=true;w.textContent='Точно удалить всё? Нажмите ещё раз';setTimeout(function(){armed=false;w.textContent='Удалить все записи и мои продукты'},4000);return}
    S={custom:[],days:{}};try{localStorage.removeItem(KEY)}catch(e){}armed=false;w.textContent='Удалить все записи и мои продукты';showRes();render()});
  load();showRes();render();
})();
