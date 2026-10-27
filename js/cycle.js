/* Учёт цикла — общий модуль для журнала прогресса, тренировки дня, плана возвращения, дневника и питания.
   Принцип «Сила без перегибов»: сила и прогресс от фазы цикла в среднем не зависят
   (McNulty et al., Sports Medicine, 2020; Colenso-Semple et al., Frontiers in Sports and Active Living, 2023),
   поэтому план меняется только по самочувствию, а цикл даёт подсказки и личную картину.
   Аппетит и обмен во второй половине цикла: Tucker et al., Nutrition Reviews, 2025 (+≈168 ккал потребления,
   невзвешенная разница); Hurtová et al., Frontiers in Physiology, 2026 (обмен в покое +≈30–120 ккал, 3–5 %).
   Все данные — только в localStorage этого браузера, никуда не отправляются. */
(function(){
  'use strict';
  var KS='cycle_settings_v1',KSTART='cycle_start_v1';
  var DEF={on:false,mode:'regular',len:28,per:5};
  var MODES=['regular','irregular','hormonal'];
  var subs=[];

  function today(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
  function isDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;var d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v}
  function ms(iso){return Date.UTC(+iso.slice(0,4),+iso.slice(5,7)-1,+iso.slice(8,10))}
  function days(a,b){return Math.round((ms(b)-ms(a))/864e5)}
  function addDays(iso,n){return new Date(ms(iso)+n*864e5).toISOString().slice(0,10)}
  function fd(iso){return iso.slice(8,10)+'.'+iso.slice(5,7)}
  function int(v,a,b){return typeof v==='number'&&isFinite(v)&&Math.round(v)===v&&v>=a&&v<=b}

  function get(){var x=null;try{x=JSON.parse(localStorage.getItem(KS)||'null')}catch(e){}
    var s={on:DEF.on,mode:DEF.mode,len:DEF.len,per:DEF.per};
    if(x&&typeof x==='object'){
      if(typeof x.on==='boolean')s.on=x.on;
      if(MODES.indexOf(x.mode)>=0)s.mode=x.mode;
      if(int(x.len,21,45))s.len=x.len;
      if(int(x.per,2,10))s.per=x.per;
    }
    return s}
  function set(p){var s=get();Object.keys(p).forEach(function(k){s[k]=p[k]});
    try{localStorage.setItem(KS,JSON.stringify(s))}catch(e){}emit();return s}
  /* дата начала последних месячных — та же, что у дневника самочувствия */
  function start(){var v=null;try{v=localStorage.getItem(KSTART)}catch(e){}
    if(!isDate(v))return null;var t=today();if(v>t||days(v,t)>365)return null;return v}
  function setStart(v){try{if(v)localStorage.setItem(KSTART,v);else localStorage.removeItem(KSTART)}catch(e){}emit()}
  function emit(){subs.forEach(function(f){try{f(get())}catch(e){}})}
  function onChange(f){subs.push(f)}

  /* День цикла для даты. Даты до начала последнего цикла при регулярном цикле
     считаются назад по обычной длине (не дальше трёх циклов) — это прогноз. */
  function dayOn(iso){var s=get(),st=start();if(!s.on||!st||!isDate(iso))return null;
    var diff=days(st,iso)+1;
    if(diff>=1)return diff<=60?diff:null;
    if(s.mode!=='regular'||-diff>=3*s.len)return null;
    return ((diff-1)%s.len+s.len)%s.len+1}
  function rawDay(){var st=start();return st?days(st,today())+1:null}
  /* Фазы: men — дни месячных; при регулярном цикле fol — первая половина, lut — примерно 14 дней
     перед следующими месячными, late — день больше обычной длины. При нерегулярном цикле и гормональной
     контрацепции фазы не прогнозируются: только men / other. */
  function phase(d,s){s=s||get();if(!int(d,1,60))return null;
    if(d<=s.per)return 'men';
    if(s.mode!=='regular')return 'other';
    if(d>s.len)return 'late';
    if(d>s.len-14)return 'lut';
    return 'fol'}
  var PNAME={men:'дни месячных',fol:'первая половина цикла',lut:'вторая половина цикла, перед месячными',late:'дольше обычной длины цикла',other:'вне дней месячных'};
  function phaseName(p){return PNAME[p]||''}
  /* Прогноз дней месячных в промежутке [from; from+n) — только при регулярном цикле */
  function windows(from,n){var s=get(),st=start();if(!s.on||s.mode!=='regular'||!st)return [];
    var out=[],to=addDays(from,n-1);
    for(var k=0;k<24;k++){var a=addDays(st,k*s.len),b=addDays(a,s.per-1);
      if(a>to)break;if(b<from)continue;
      if(k===0)continue; /* текущие месячные уже начались — прогнозируем только следующие */
      out.push({s:a,e:b})}
    return out}

  var FLAGS='<ul class="cyc-flags"><li>сильная боль, из-за которой приходится отменять обычные дела;</li><li>очень обильные месячные, слабость, головокружение, одышка при обычной нагрузке;</li><li>цикл резко изменился, стал нерегулярным или появились кровянистые выделения между месячными;</li><li>месячных нет 3 месяца и дольше — если вы не беременны и это не эффект гормональной контрацепции; часто это признак того, что телу не хватает энергии на нагрузку;</li><li>перед месячными настроение падает так, что это мешает жить и работать.</li></ul>';

  function statusText(){var s=get(),st=start();
    if(!s.on)return 'Учёт цикла выключен: тренировки и подсказки — как для всех.';
    if(!st){var rd=null;try{rd=localStorage.getItem(KSTART)}catch(e){}
      if(isDate(rd)&&rd<=today())return 'Последние месячные начались больше года назад — обновите дату. Если месячных нет 3 месяца и дольше, обратитесь к гинекологу.';
      return 'Укажите первый день последних месячных — день цикла посчитается сам.'}
    var d=rawDay();
    if(d>60)return 'С начала последних месячных прошло '+d+' дней. Обновите дату. Если месячных нет 3 месяца и дольше, обратитесь к гинекологу.';
    var p=phase(d,s),t='Сегодня '+d+'-й день цикла';
    if(s.mode==='regular'){
      if(p==='late')return t+' — дольше вашей обычной длины. Задержки бывают из-за стресса, болезни, резкого снижения веса или большой нагрузки; если возможна беременность — сделайте тест. Начались месячные — обновите дату.';
      var w=windows(today(),45)[0];
      return t+' · '+phaseName(p)+'.'+(w?' Следующие месячные по прогнозу — около '+fd(w.s)+'.':'')}
    if(s.mode==='irregular')return t+' от начала последних месячных'+(p==='men'?' · дни месячных':'')+'. При нерегулярном цикле фазы не прогнозируем — подсказки по дням месячных и самочувствию.';
    return t+(p==='men'?' · дни кровотечения':'')+'. При гормональной контрацепции гормоны меняются иначе, чем при естественном цикле, поэтому фазы не прогнозируем — подсказки по дням кровотечения и самочувствию.'}

  /* Панель настроек: одна и та же на всех страницах, настройки общие */
  var nMount=0;
  function mount(el){if(!el)return;var id='cy'+(++nMount);
    el.classList.add('cyc-panel');
    el.innerHTML='<label class="check cyc-on"><input type="checkbox" id="'+id+'on"><span><b>Учитывать цикл</b> <span class="small">— подсказки по дням цикла в журнале, тренировке дня, плане возвращения и питании</span></span></label>'+
      '<div class="cyc-body" id="'+id+'body">'+
        '<div class="field"><span class="flabel">Какой у вас цикл</span><div class="opts" role="radiogroup" aria-label="Какой у вас цикл">'+
          '<input type="radio" name="'+id+'m" id="'+id+'m1" value="regular"><label for="'+id+'m1">Регулярный</label>'+
          '<input type="radio" name="'+id+'m" id="'+id+'m2" value="irregular"><label for="'+id+'m2">Нерегулярный</label>'+
          '<input type="radio" name="'+id+'m" id="'+id+'m3" value="hormonal"><label for="'+id+'m3">Гормональная контрацепция</label></div></div>'+
        '<div class="calc-grid">'+
          '<div class="field"><label for="'+id+'st">Первый день последних месячных</label><input id="'+id+'st" type="date"></div>'+
          '<div class="field cyc-len"><label for="'+id+'len">Обычная длина цикла, дней</label><input id="'+id+'len" type="number" inputmode="numeric" min="21" max="45"></div>'+
          '<div class="field"><label for="'+id+'per">Сколько дней идут месячные</label><input id="'+id+'per" type="number" inputmode="numeric" min="2" max="10"></div>'+
        '</div>'+
        '<p class="verdict cyc-status" id="'+id+'stat" aria-live="polite"></p>'+
        '<details class="cyc-more"><summary>Когда стоит обратиться к гинекологу</summary>'+FLAGS+'</details>'+
      '</div>'+
      '<p class="small cyc-priv">Настройки и даты хранятся только в этом браузере на этом устройстве и никуда не отправляются. Это помощник для тренировок, а не способ контрацепции или планирования беременности.</p>';
    var on=document.getElementById(id+'on'),body=document.getElementById(id+'body'),stI=document.getElementById(id+'st'),
        len=document.getElementById(id+'len'),per=document.getElementById(id+'per'),stat=document.getElementById(id+'stat'),lw=el.querySelector('.cyc-len');
    stI.max=today();
    function fill(){var s=get(),raw=null;try{raw=localStorage.getItem(KSTART)}catch(e){}
      on.checked=s.on;body.hidden=!s.on;
      var r=el.querySelector('input[name="'+id+'m"][value="'+s.mode+'"]');if(r)r.checked=true;
      if(document.activeElement!==stI)stI.value=isDate(raw)?raw:'';
      if(document.activeElement!==len)len.value=s.len;
      if(document.activeElement!==per)per.value=s.per;
      lw.hidden=s.mode!=='regular';stat.textContent=statusText()}
    on.addEventListener('change',function(){set({on:on.checked})});
    el.querySelectorAll('input[name="'+id+'m"]').forEach(function(r){r.addEventListener('change',function(){set({mode:r.value})})});
    stI.addEventListener('change',function(){var v=stI.value;
      if(!v){setStart('');return}
      if(!isDate(v)||v>today()){stat.textContent='Дата не может быть в будущем.';return}
      setStart(v)});
    function num(inp,a,b,key,label){inp.addEventListener('change',function(){var v=+String(inp.value).replace(',','.');
      if(!int(v,a,b)){stat.textContent=label+' — целое число от '+a+' до '+b+'. Сохранено прежнее значение.';inp.value=get()[key];return}
      var p={};p[key]=v;set(p)})}
    num(len,21,45,'len','Длина цикла');num(per,2,10,'per','Дни месячных');
    onChange(fill);fill()}

  /* Подсказка по питанию на выбранную дату. Цифры еды и калорий не меняет. */
  function foodHint(iso){var s=get();if(!s.on)return '';
    if(!start())return '<p class="small">Чтобы подсказки учитывали цикл, укажите первый день последних месячных в настройках.</p>';
    var d=dayOn(iso);if(!d)return '';
    var p=phase(d,s),h='<b>'+d+'-й день цикла'+(s.mode==='regular'&&iso>today()?' (прогноз)':'')+'.</b> ';
    if(p==='men')return '<p>'+h+'Дни месячных. Аппетит в эти дни бывает и выше, и ниже обычного — оба варианта нормальны. Если месячные обильные и вы часто чувствуете слабость, скажите об этом врачу: при больших потерях крови бывает нехватка железа. Продукты с железом — мясо, печень, рыба, бобовые, гречка.</p>';
    if(p==='lut')return '<p>'+h+'Вторая половина цикла. В исследованиях в эти дни женщины в среднем едят примерно на 170 ккал в день больше, а обмен в покое выше примерно на 30–120 ккал. Если хочется есть сильнее — это нормально: компенсировать голодом или лишней тренировкой не нужно. Наесться помогают белок и клетчатка — <a href="golod.html#pered-mesyachnymi">что съесть</a>.</p><p class="small">Разница небольшая и у всех разная, поэтому цифры здесь не меняются. Источники — в разборе <a href="nauka.html#tsikl-eda">«Аппетит и цикл»</a>.</p>';
    if(p==='late')return '<p>'+h+'Дольше вашей обычной длины цикла — прогноз фаз сейчас не работает. Начались месячные — обновите дату в настройках.</p>';
    return '<p>'+h+(p==='fol'?'Первая половина цикла':'Вне дней месячных')+' — особых поправок в еде не нужно.</p>'}

  /* Подсказка к тренировке на сегодня */
  function trainHint(){var s=get();if(!s.on)return '';var d=dayOn(today());if(!d)return '';
    var p=phase(d,s);
    if(p==='men')return 'Сегодня '+d+'-й день цикла, дни месячных. Чувствуете себя как обычно — тренируйтесь как обычно. Тяжело или болит — отметьте это в «Самочувствии сегодня», тренировка станет легче.';
    if(p==='lut')return 'Сегодня '+d+'-й день цикла, вторая половина. Сила в эти дни в среднем не ниже — ориентируйтесь на самочувствие.';
    if(p==='late')return 'Сегодня '+d+'-й день цикла — дольше обычного. Тренируйтесь по самочувствию; начались месячные — обновите дату в настройках.';
    return 'Сегодня '+d+'-й день цикла. Тренируйтесь по самочувствию.'}

  window.Cycle={get:get,set:set,start:start,setStart:setStart,onChange:onChange,dayOn:dayOn,phase:phase,phaseName:phaseName,
    windows:windows,mount:mount,foodHint:foodHint,trainHint:trainHint,statusText:statusText,today:today,isDate:isDate,addDays:addDays,days:days,FLAGS:FLAGS};
  function mountAll(){document.querySelectorAll('[data-cycle-panel]').forEach(function(el){if(!el.classList.contains('cyc-panel'))mount(el)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll);else mountAll();
})();
