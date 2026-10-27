/* Карточки техники: кнопка «Как делать» рядом с упражнением и окно с картинкой.
   Картинки — img/tehnika/<slug>.webp (720×960). Карточка показывается только для того же движения,
   варианты с другой механикой (на одной ноге, сидя, под углом) — без карточки. */
(function(){
  'use strict';
  var T={
    prised:['Приседания с собственным весом','Присед с паузой внизу 2 секунды'],
    goblet:['Гоблет-присед с гантелью','Присед в тренажёре Смита или гоблет-присед'],
    vypady:['Выпады назад попеременно','Выпады назад с гантелями'],
    most:['Ягодичный мост','Ягодичный мост с гантелью на бёдрах','Ягодичный мост со штангой','Ягодичный мост с гантелью или штангой','Ягодичный мост с гантелью'],
    rumynskaya:['Румынская тяга с гантелями','Румынская тяга со штангой'],
    superman:['«Супермен» лёжа на животе'],
    'tyaga-ganteli':['Тяга гантели в наклоне с опорой на скамью или стул','Тяга гантели в наклоне с опорой'],
    'verhniy-blok':['Тяга верхнего блока к груди'],
    otzhimaniya:['Отжимания от стола или подоконника','Отжимания от опоры','Отжимания от опоры (стол, диван)'],
    'zhim-skamya':['Жим гантелей на скамье'],
    'zhim-stoya':['Жим гантелей стоя над головой'],
    planka:['Планка на предплечьях'],
    zhuk:['«Мёртвый жук»'],
    noski:['Подъёмы на носки','Подъёмы на носки с гантелями','Подъёмы на носки с паузой','Подъёмы на носки в тренажёре'],
    koshka:['«Кошка-корова» на четвереньках']
  };
  var BY={};Object.keys(T).forEach(function(s){T[s].forEach(function(n){BY[n]=s})});
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function slug(name){return BY[name]||null}
  function btn(name){var s=slug(name);return s?' <button type="button" class="how-btn no-print" data-how="'+s+'" data-name="'+esc(name)+'" aria-haspopup="dialog">Как делать</button>':''}
  var dlg=null;
  function open(s,name,from){
    if(!dlg){dlg=document.createElement('dialog');dlg.className='how-dlg';dlg.setAttribute('aria-label','Техника упражнения');
      dlg.innerHTML='<div class="how-in"><button type="button" class="how-x" aria-label="Закрыть">×</button><img alt="" width="720" height="960"><p class="small">Общая схема техники. Сомневаетесь, что делаете правильно, — снимите подход на видео и пришлите Алёне, напишите «СТАРТ».</p></div>';
      document.body.appendChild(dlg);
      dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('.how-x'))dlg.close()});
      dlg.addEventListener('close',function(){if(dlg._from)try{dlg._from.focus()}catch(e){}})}
    var img=dlg.querySelector('img');img.src='img/tehnika/'+s+'.webp';img.alt='Техника: '+name+' — старт и финиш, подсказки и частая ошибка';
    dlg._from=from;
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
    dlg.querySelector('.how-x').focus();
  }
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.how-btn');if(!b)return;e.preventDefault();open(b.dataset.how,b.dataset.name,b)});
  window.Tehnika={slug:slug,btn:btn,open:open,list:T};
})();
