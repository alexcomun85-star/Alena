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

  /* Телефон и планшет: всё управление — в нижней панели под большим пальцем.
     Главная (на главной — «Наверх», в режиме приложения — «Назад») · Мой зал · Инструменты · Меню.
     Меню открывается шторкой снизу, пункты прижаты к низу экрана. */
  var menu=document.getElementById('mnav'),btn=document.getElementById('menuBtn');
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  var home=path==='index.html'||path==='';
  var I={home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',back:'<path d="M15 5l-7 7 7 7"/>',tools:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'};
  function ico(d){return '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'}
  var first=home?'<button type="button" class="home-btn dock-top">'+ico(I.up)+'<span>Наверх</span></button>'
    :standalone?'<button type="button" class="home-btn dock-back">'+ico(I.back)+'<span>Назад</span></button>'
    :'<a class="home-btn" href="./">'+ico(I.home)+'<span>Главная</span></a>';
  var dock=document.createElement('nav');dock.className='dock';dock.setAttribute('aria-label','Быстрые действия');
  dock.innerHTML='<div class="w">'+first+
    '<a class="home-btn zal-dock" href="moy-zal.html"'+(path==='moy-zal.html'?' aria-current="page"':'')+'>'+ico(I.star)+'<span>Мой зал</span><i class="zal-n" hidden></i></a>'+
    '<a class="home-btn dock-tools" href="./#tools">'+ico(I.tools)+'<span>Инструменты</span></a>'+
    (menu?'<button type="button" class="home-btn dock-menu" id="dockMenu" aria-expanded="false" aria-controls="mnav"><span class="burger" aria-hidden="true"></span><span class="dm-t">Меню</span></button>':'')+
    '</div>';
  document.body.appendChild(dock);
  var t=dock.querySelector('.dock-top');if(t)t.addEventListener('click',function(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})});
  var bk=dock.querySelector('.dock-back');if(bk)bk.addEventListener('click',function(){if(history.length>1)history.back();else location.href='./'});
  if(!menu)return;
  var dm=document.getElementById('dockMenu');
  var behind=[].slice.call(document.querySelectorAll('main,header.bar,footer,.skip-link'));
  function set(o){menu.hidden=!o;document.body.classList.toggle('menu-open',o);
    behind.forEach(function(el){el.inert=o});
    if(btn){btn.setAttribute('aria-expanded',o);btn.lastChild.textContent=o?'Закрыть':'Меню'}
    dm.setAttribute('aria-expanded',o);dm.querySelector('.dm-t').textContent=o?'Закрыть':'Меню';
    if(o){var s=menu.querySelector('details[open] summary')||menu.querySelector('summary');s&&s.focus({preventScroll:true});menu.scrollTop=menu.scrollHeight}}
  if(btn)btn.addEventListener('click',function(){set(menu.hidden)});
  dm.addEventListener('click',function(){set(menu.hidden)});
  menu.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){set(false);(dm.offsetParent?dm:btn).focus()}});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Tab'||menu.hidden)return;
    var q='a,button,summary,input,select,textarea,[tabindex]';
    var nodes=[].slice.call(menu.querySelectorAll(q)).concat([].slice.call(dock.querySelectorAll(q))).filter(function(el){return !el.disabled&&el.tabIndex>=0&&el.getClientRects().length});
    if(!nodes.length)return;var first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  /* в аккордеоне открыта одна группа за раз */
  var ds=[].slice.call(menu.querySelectorAll('details.mg'));
  ds.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)ds.forEach(function(o){if(o!==d)o.open=false})})});
  /* Fold/поворот: скрытое широким макетом меню не должно блокировать страницу. */
  var wide=window.matchMedia('(min-width:1024px)');
  function layoutChanged(){if(wide.matches&&!menu.hidden)set(false);if(!wide.matches&&openDd)close(openDd)}
  if(wide.addEventListener)wide.addEventListener('change',layoutChanged);
  else if(wide.addListener)wide.addListener(layoutChanged);
})();

/* Обратная связь: только изменившиеся сообщения после загрузки, без сдвига вёрстки. */
(function(){
  if(!window.MutationObserver)return;
  function setup(){
    var motion=window.matchMedia('(prefers-reduced-motion:reduce)'),running=new WeakMap();
    document.querySelectorAll('.verdict[aria-live]').forEach(function(el){
      var previous=el.textContent;
      new MutationObserver(function(){
        var next=el.textContent;if(next===previous)return;previous=next;
        var old=running.get(el);if(old)old.cancel();
        if(!next.trim()||motion.matches||!el.animate||!el.getClientRects().length)return;
        running.set(el,el.animate([{opacity:.55},{opacity:1}],{duration:180,easing:'ease-out'}));
      }).observe(el,{childList:true,characterData:true,subtree:true});
    });
    function stop(){if(motion.matches)document.querySelectorAll('.verdict[aria-live]').forEach(function(el){var a=running.get(el);if(a)a.cancel()})}
    if(motion.addEventListener)motion.addEventListener('change',stop);
    else if(motion.addListener)motion.addListener(stop);
  }
  if(document.readyState==='complete')setup();else window.addEventListener('load',setup,{once:true});
})();
