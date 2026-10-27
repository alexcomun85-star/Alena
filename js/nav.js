/* Навигация: выпадающие группы на ПК, полноэкранное меню-аккордеон на телефоне. */
(function(){
  var path=location.pathname.split('/').pop()||'index.html';
  function isCur(h){if(!h||/^https?:/.test(h))return false;var p=h.split('#')[0];return p===path||(p==='./'&&path==='index.html'&&!h.includes('#'))||(p===''&&false)}
  /* текущая страница и её группа */
  var curGroup=null;
  document.querySelectorAll('.tnav .dd-link,.mnav .mg-links a,.mnav .m-home').forEach(function(a){
    var h=a.getAttribute('href');
    if(isCur(h)&&!/#/.test(h)){a.setAttribute('aria-current','page');var g=a.closest('[data-group]');if(g)curGroup=g.getAttribute('data-group')}
  });
  if(!curGroup)document.querySelectorAll('.tnav .dd-link').forEach(function(a){var h=a.getAttribute('href');if(isCur(h)){var g=a.closest('[data-group]');if(g)curGroup=g.getAttribute('data-group')}});
  if(curGroup){document.querySelectorAll('[data-group="'+curGroup+'"]').forEach(function(g){g.classList.add('is-cur');if(g.tagName==='DETAILS')g.open=true})}

  /* ПК: выпадающие панели */
  var dds=[].slice.call(document.querySelectorAll('.tnav .dd')),openDd=null,tIn,tOut;
  function close(dd){if(!dd)return;dd.querySelector('.dd-btn').setAttribute('aria-expanded','false');dd.querySelector('.dd-panel').hidden=true;dd.classList.remove('open');if(openDd===dd)openDd=null}
  function open(dd){if(openDd&&openDd!==dd)close(openDd);dd.querySelector('.dd-btn').setAttribute('aria-expanded','true');dd.querySelector('.dd-panel').hidden=false;dd.classList.add('open');openDd=dd}
  var hover=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  dds.forEach(function(dd,i){
    var b=dd.querySelector('.dd-btn');
    b.addEventListener('click',function(){dd.classList.contains('open')?close(dd):open(dd)});
    b.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){e.preventDefault();open(dd);var f=dd.querySelector('.dd-panel a');f&&f.focus()}
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();var n=dds[(i+(e.key==='ArrowRight'?1:dds.length-1))%dds.length];n.querySelector('.dd-btn').focus();if(openDd)open(n)}
    });
    if(hover){
      dd.addEventListener('mouseenter',function(){clearTimeout(tOut);tIn=setTimeout(function(){open(dd)},openDd?0:120)});
      dd.addEventListener('mouseleave',function(){clearTimeout(tIn);tOut=setTimeout(function(){close(dd)},220)});
    }
    dd.addEventListener('focusout',function(e){if(!dd.contains(e.relatedTarget))close(dd)});
  });
  document.addEventListener('click',function(e){if(openDd&&!openDd.contains(e.target))close(openDd)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&openDd){var b=openDd.querySelector('.dd-btn');close(openDd);b.focus()}});

  /* Телефон: полноэкранное меню */
  var btn=document.getElementById('menuBtn'),menu=document.getElementById('mnav');if(!btn||!menu)return;
  function set(o){menu.hidden=!o;btn.setAttribute('aria-expanded',o);document.body.classList.toggle('menu-open',o);btn.lastChild.textContent=o?'Закрыть':'Меню';if(o){var s=menu.querySelector('details[open] summary')||menu.querySelector('summary');s&&s.focus()}}
  btn.addEventListener('click',function(){set(menu.hidden)});
  menu.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){set(false);btn.focus()}});
  /* в аккордеоне открыта одна группа за раз */
  var ds=[].slice.call(menu.querySelectorAll('details.mg'));
  ds.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)ds.forEach(function(o){if(o!==d)o.open=false})})});
})();

/* Нижняя панель на телефоне для внутренних страниц: «Главная», «Мой зал» и «Написать СТАРТ» (на главной — своя панель #dock) */
(function(){
  if(document.getElementById('dock')||document.querySelector('.dock'))return;
  var d=document.createElement('div');d.className='dock dock-inner';
  d.innerHTML='<div class="w"><a class="home-btn" href="./" aria-label="На главную"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg><span>Главная</span></a><a class="home-btn zal-dock" href="moy-zal.html" aria-label="Мой зал"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg><span>Мой зал</span><i class="zal-n" hidden></i></a><a class="btn btn-main" href="https://t.me/Gym_mom1988" target="_blank" rel="noopener">Написать «СТАРТ»</a></div>';
  document.body.appendChild(d);
})();

