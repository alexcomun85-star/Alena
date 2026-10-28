/* Дневник самочувствия: проверяемое локальное хранение и перенос.
   Старый ключ и формат записей сохранены. Рабочие данные меняются только после записи.
   Настройки цикла переносятся отдельно, по явному выбору пользователя. */
(function(){
  'use strict';
  var KEY='cycle_diary_v1', BACK=KEY+'_backup', ORIGINAL=KEY+'_backup_load';
  var SETTINGS='cycle_settings_v1', START='cycle_start_v1', MAX=5000;
  var data=[], blocked=false, loadNote='', day=$('cDay'), msg=$('cMsg');
  if(!day)return;
  function $(id){return document.getElementById(id)}
  function today(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
  function isDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;var d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v&&v>='2000-01-01'&&v<='2100-12-31'}
  function int(v,a,b){return typeof v==='number'&&isFinite(v)&&Math.round(v)===v&&v>=a&&v<=b}
  function valid(list,lenient){
    if(!Array.isArray(list))throw Error('записи должны быть списком');
    if(list.length>MAX)throw Error('слишком много записей (максимум '+MAX+')');
    var clean=[],seen=Object.create(null),skipped=0;
    list.forEach(function(x){
      if(!x||typeof x!=='object'||!isDate(x.date)||!int(x.d,1,60)||!int(x.e,1,5)||!int(x.t,0,3)||seen[x.date]){
        if(!lenient)throw Error('неверная дата, повтор даты или значение записи');skipped++;return;
      }
      seen[x.date]=true;clean.push({date:x.date,d:x.d,e:x.e,t:x.t});
    });
    return {data:clean,skipped:skipped};
  }
  function settings(x){
    if(!x||typeof x.on!=='boolean'||['regular','irregular','hormonal'].indexOf(x.mode)<0||!int(x.len,21,45)||!int(x.per,2,10))throw Error('неверные настройки цикла');
    return {on:x.on,mode:x.mode,len:x.len,per:x.per};
  }
  function notify(text){msg.textContent=text}
  function transfer(text){$('cycleTransferMsg').textContent=text}
  function load(){
    var raw;
    try{raw=localStorage.getItem(KEY)}catch(e){blocked=true;loadNote='Браузер не дал прочитать дневник. Сохранение недоступно; прежние записи не изменены.';return}
    if(raw===null)return;
    try{
      var c=valid(JSON.parse(raw),true);
      if(c.skipped){
        // Не перезаписываем исходник; новую запись разрешаем только после сохранения оригинала.
        if(localStorage.getItem(ORIGINAL)===null)localStorage.setItem(ORIGINAL,raw);
        else if(localStorage.getItem(ORIGINAL)!==raw)throw Error('предыдущий исходник уже сохранён');
        loadNote='Скрыто неверных записей: '+c.skipped+'. Остальные доступны. Исходную версию можно скачать ниже.';
      }
      data=c.data;
    }catch(e){blocked=true;loadNote='Сохранённые данные повреждены или не удалось сохранить исходную копию. Они не перезаписаны. Скачайте исходник ниже или восстановите дневник из проверенного файла.'}
  }
  function backupUi(){try{$('cycleRestore').disabled=localStorage.getItem(BACK)===null;$('cycleBackup').disabled=$('cycleRestore').disabled;$('cycleOriginal').disabled=!blocked&&localStorage.getItem(ORIGINAL)===null}catch(e){$('cycleRestore').disabled=true;$('cycleBackup').disabled=true;$('cycleOriginal').disabled=true}}
  function commit(next){
    if(blocked){notify('Сначала сохраните исходник и восстановите дневник из файла. Повреждённые данные не перезаписаны.');return false}
    try{localStorage.setItem(KEY,JSON.stringify(next));data=next;return true}
    catch(e){notify('Не удалось сохранить. Запись не добавлена; введённые значения оставлены. Скачайте копию дневника и проверьте свободное место или разрешения браузера.');return false}
  }
  function snapshot(withSettings){
    var s={diary:localStorage.getItem(KEY)};
    if(withSettings){s.settings=localStorage.getItem(SETTINGS);s.start=localStorage.getItem(START)}return s;
  }
  function write(k,v){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}
  function apply(s){write(KEY,s.diary);if(Object.prototype.hasOwnProperty.call(s,'settings')){write(SETTINGS,s.settings);write(START,s.start)}}
  function replace(next,withSettings){
    var prev,oldBackup;
    try{
      oldBackup=localStorage.getItem(BACK);
      prev=snapshot(withSettings);
      localStorage.setItem(BACK,JSON.stringify(prev));
      apply(next);
    }catch(e){
      var restored=true;
      if(prev)try{apply(prev);write(BACK,oldBackup)}catch(ignore){restored=false}
      transfer(restored?'Не удалось сохранить замену. Текущие записи не изменены.':'Не удалось завершить замену и вернуть все значения. Прежняя версия находится в резервной копии ниже; скачайте её.');
      backupUi();return false;
    }
    blocked=false;data=next.diary===null?[]:valid(JSON.parse(next.diary),false).data;
    if(window.Cycle&&Cycle.refresh)Cycle.refresh();
    calc();render();backupUi();return true;
  }
  function download(raw,name){var blob=new Blob([raw],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
  function pack(s){
    var p={format:'alenafit-cycle-diary',version:1,diary:valid(JSON.parse(s.diary||'[]'),false).data};
    if(Object.prototype.hasOwnProperty.call(s,'settings')){p.settings=s.settings===null?null:settings(JSON.parse(s.settings));p.start=s.start;if(p.start!==null&&!isDate(p.start))throw Error('неверная дата начала цикла')}
    return p;
  }
  function readPack(x){
    if(Array.isArray(x))return {diary:JSON.stringify(valid(x,false).data)}; // прежний массив дневника
    if(!x||x.format!=='alenafit-cycle-diary'||x.version!==1)throw Error('неподдерживаемый формат или версия');
    var s={diary:JSON.stringify(valid(x.diary,false).data)};
    if(Object.prototype.hasOwnProperty.call(x,'settings')){
      s.settings=x.settings===null?null:JSON.stringify(settings(x.settings));
      if(x.start!==null&&(!isDate(x.start)||x.start>today()))throw Error('неверная дата начала цикла');s.start=x.start;
    }
    return s;
  }
  function readBackup(){
    var s=JSON.parse(localStorage.getItem(BACK)||'null');
    if(!s||!(s.diary===null||typeof s.diary==='string'))throw Error('резервная копия недоступна');
    if(Object.prototype.hasOwnProperty.call(s,'settings')&&(!(s.settings===null||typeof s.settings==='string')||!(s.start===null||typeof s.start==='string')))throw Error('резервная копия повреждена');
    return s;
  }
  function calc(){var d=window.Cycle?Cycle.dayOn(today()):null;if(d){day.value=d;$('cDayInfo').textContent='Сегодня '+d+'-й день цикла — по настройкам выше. Можно поправить вручную.'}else $('cDayInfo').textContent='Включите «Учитывать цикл» и укажите первый день последних месячных выше — день посчитается сам. Или введите его вручную.'}
  function selected(n){var e=document.querySelector('input[name="'+n+'"]:checked');return e?+e.value:null}
  var BUCK=[[1,5],[6,10],[11,15],[16,20],[21,25],[26,60]],TR=['не было','легко','нормально','тяжело'];
  function render(){
    $('cCount').textContent=data.length?'Записей: '+data.length+'.':'Записей пока нет.';
    if(data.length<6)$('cChart').innerHTML='<p class="small">Картина появится после 6 записей. Самые полезные выводы — через 2–3 цикла.</p>';
    else $('cChart').innerHTML='<div class="cbars">'+BUCK.map(function(b){var it=data.filter(function(x){return x.d>=b[0]&&x.d<=b[1]}),avg=it.length?it.reduce(function(a,x){return a+x.e},0)/it.length:0,hard=it.filter(function(x){return x.t===3}).length;return '<div class="cbar"><div class="cbar-col"><div class="cbar-fill" style="height:'+Math.round(avg/5*100)+'%"></div></div><b>'+(it.length?avg.toFixed(1).replace('.',','):'—')+'</b><span>дни '+b[0]+(b[1]>30?'+':'–'+b[1])+'</span><span class="ch">'+(hard?'тяжело: '+hard:'&nbsp;')+'</span></div>'}).join('')+'</div><p class="small">Столбик — средняя энергия от 1 до 5 в эти дни цикла. «Тяжело» — сколько тренировок прошли тяжело.</p>';
    var last=data.slice().sort(function(a,b){return a.date<b.date?1:-1}).slice(0,7);
    $('cList').innerHTML=last.length?'<ul class="clist">'+last.map(function(x){var p=x.date.split('-');return '<li><span>'+p[2]+'.'+p[1]+' · '+x.d+'-й день</span><span>энергия '+x.e+' · '+TR[x.t]+'</span></li>'}).join('')+'</ul>':'';
  }
  $('cSave').addEventListener('click',function(){
    var d=+day.value,e=selected('cEn'),t=selected('cTr');
    if(!int(d,1,60)){notify('Укажите целый день цикла от 1 до 60.');day.focus();return}
    if(!int(e,1,5)||!int(t,0,3)){notify('Отметьте энергию и тренировку.');return}
    var dt=today(),next=data.filter(function(x){return x.date!==dt});
    if(next.length>=MAX){notify('В дневнике уже '+MAX+' записей. Скачайте копию перед очисткой.');return}
    next.push({date:dt,d:d,e:e,t:t});
    if(commit(next)){render();notify('Сохранено. Записей: '+data.length+'.')}
  });
  $('cycleExport').addEventListener('click',function(){try{if(blocked)throw Error('сначала скачайте исходник');var s={diary:JSON.stringify(data)};if($('cycleWithSettings').checked){s.settings=localStorage.getItem(SETTINGS);s.start=localStorage.getItem(START)}download(JSON.stringify(pack(s),null,1),'alenafit-cycle-diary');transfer('Копия подготовлена. Файл содержит личные записи; храните его у себя.')}catch(e){transfer('Не удалось подготовить копию: '+e.message+'.')}});
  $('cycleOriginal').addEventListener('click',function(){try{var raw=blocked?localStorage.getItem(KEY):localStorage.getItem(ORIGINAL);if(raw===null)throw Error();download(raw,'alenafit-cycle-original')}catch(e){transfer('Не удалось скачать исходную версию.')}});
  $('cycleBackup').addEventListener('click',function(){try{var raw=readBackup();try{download(JSON.stringify(pack(raw),null,1),'alenafit-cycle-backup');transfer('Резервная копия подготовлена. Её можно восстановить из файла.')}catch(invalid){download(JSON.stringify(raw,null,1),'alenafit-cycle-backup-raw');transfer('Скачана исходная повреждённая версия для восстановления специалистом.')}}catch(e){transfer('Резервной копии пока нет или она недоступна.')}});
  $('cycleImport').addEventListener('change',function(){
    var input=this,file=input.files&&input.files[0];if(!file)return;
    if(file.size>5*1024*1024){transfer('Файл не принят: размер больше 5 МБ.');input.value='';return}
    var reader=new FileReader();reader.onerror=function(){transfer('Не удалось прочитать файл. Записи не изменены.');input.value=''};
    reader.onload=function(){try{
      var next=readPack(JSON.parse(reader.result)),withSettings=$('cycleWithSettings').checked&&Object.prototype.hasOwnProperty.call(next,'settings');
      if(!withSettings){delete next.settings;delete next.start}
      if(!confirm('Заменить записи дневника данными из файла?'+(withSettings?' Также будут заменены общие настройки и дата начала цикла на всех страницах.':' Настройки цикла останутся прежними.')+' Прежняя версия останется резервной копией.'))return;
      if(replace(next,withSettings)){notify('Дневник восстановлен из файла.');transfer('Записи восстановлены.'+(withSettings?' Настройки цикла также восстановлены.':' Общие настройки не изменены.'))}
    }catch(e){transfer('Файл не принят: '+e.message+'. Текущие записи не изменены.')}finally{input.value=''}};reader.readAsText(file);
  });
  $('cycleRestore').addEventListener('click',function(){try{var prev=readBackup();pack(prev);if(!confirm('Вернуть предыдущую версию дневника?'+(Object.prototype.hasOwnProperty.call(prev,'settings')?' Будут возвращены и прежние настройки цикла.':'')+' Нынешняя версия станет резервной копией.'))return;if(replace(prev,Object.prototype.hasOwnProperty.call(prev,'settings'))){notify('Предыдущая версия возвращена.');transfer('Предыдущая версия возвращена.')}}catch(e){transfer('Вернуть копию нельзя: '+e.message+'. Скачайте исходную резервную копию для восстановления.')}});
  var armed=false,wipe=$('cWipe');
  wipe.addEventListener('click',function(){if(!armed){armed=true;wipe.textContent='Точно удалить? Нажмите ещё раз';setTimeout(function(){armed=false;wipe.textContent='Удалить все записи'},4000);return}
    armed=false;wipe.textContent='Удалить все записи';
    if(replace({diary:'[]'},false)){day.value='';calc();notify('Записи удалены. Предыдущую версию можно вернуть ниже.');transfer('Перед очисткой сохранена резервная копия.')}
  });
  load();calc();render();backupUi();if(loadNote)notify(loadNote);
  if(window.Cycle)Cycle.onChange(calc);
})();
