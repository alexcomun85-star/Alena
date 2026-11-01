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
     Главная (на главной — «Наверх», в режиме приложения — «Назад») · Избранное · Афита (в центре) · Инструменты · Меню.
     Меню открывается шторкой снизу, пункты прижаты к низу экрана. */
  var menu=document.getElementById('mnav'),btn=document.getElementById('menuBtn');
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  var home=path==='index.html'||path==='';
  var I={home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',back:'<path d="M15 5l-7 7 7 7"/>',tools:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'};
  function ico(d){return '<i class="dock-glass" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg></i>'}
  var first=home?'<button type="button" class="home-btn dock-top">'+ico(I.up)+'<span>Наверх</span></button>'
    :standalone?'<button type="button" class="home-btn dock-back">'+ico(I.back)+'<span>Назад</span></button>'
    :'<a class="home-btn" href="./">'+ico(I.home)+'<span>Главная</span></a>';
  var dock=document.createElement('nav');dock.className='dock';dock.setAttribute('aria-label','Быстрые действия');
  dock.innerHTML='<div class="w">'+first+
    '<a class="home-btn zal-dock" href="moy-zal.html"'+(path==='moy-zal.html'?' aria-current="page"':'')+'>'+ico(I.star)+'<span>Избранное</span><i class="zal-n" hidden></i></a>'+
    '<a class="home-btn dock-afit" href="https://assistant.alenafit.com/" data-open-afit aria-controls="afit-window" aria-expanded="false"><i class="dock-glass dock-afit-glass" aria-hidden="true"><svg class="dock-afit-mark" width="22" height="19" viewBox="1066 284 444 366" aria-hidden="true" focusable="false"><defs><mask id="afit-dock-reveal" maskUnits="userSpaceOnUse" x="1066" y="284" width="444" height="366"><path class="afit-stroke afit-stroke-loop" d="M1140 610 Q1200 520 1295 495 T1465 345 M1370 490 L1490 655" pathLength="1" fill="none" stroke="white" stroke-width="115" stroke-linecap="round"/></mask></defs><path d="M1131.4 632.6C1146.1 625.4 1154.9 613.5 1175.5 573.5C1181.4 562.0 1190.6 544.4 1195.8 534.5C1210.0 507.6 1211.0 505.6 1211.0 504.5C1211.0 504.0 1216.7 492.7 1223.6 479.5C1230.5 466.3 1240.2 447.6 1245.2 438.0C1250.2 428.4 1257.1 415.3 1260.5 409.0C1263.9 402.7 1268.5 393.9 1270.8 389.5C1283.7 364.4 1287.0 358.5 1288.1 358.5C1288.7 358.5 1295.0 369.5 1302.0 383.0C1312.6 403.4 1323.2 423.3 1331.5 438.4C1333.4 441.8 1334.1 441.7 1349.0 435.4C1360.7 430.5 1374.2 423.2 1379.2 419.0C1381.7 416.9 1382.2 415.9 1381.4 414.9C1380.7 414.1 1376.1 405.4 1371.0 395.5C1365.9 385.6 1357.3 369.4 1352.0 359.5C1346.7 349.6 1339.7 336.3 1336.5 330.1C1324.9 307.4 1309.7 297.0 1288.0 297.0C1278.6 297.1 1273.2 298.3 1265.0 302.3C1254.6 307.4 1247.6 315.2 1240.0 330.1C1236.6 336.9 1230.9 347.7 1227.5 354.0C1224.0 360.3 1216.7 374.1 1211.2 384.5C1205.7 394.9 1197.9 409.8 1193.8 417.5C1189.7 425.2 1182.0 439.8 1176.7 450.0C1171.5 460.2 1165.7 471.2 1163.8 474.5C1161.9 477.8 1157.9 485.5 1154.8 491.5C1151.7 497.6 1145.2 510.0 1140.4 519.0C1135.7 528.1 1124.4 549.5 1115.5 566.5C1100.4 595.3 1089.8 615.3 1082.1 629.3C1080.4 632.5 1079.2 635.6 1079.6 636.1C1080.0 636.8 1088.1 637.0 1101.9 636.8L1123.6 636.5L1131.4 632.6Z" fill="#eef4f1" /><g mask="url(#afit-dock-reveal)"><path d="M1496.6 636.6C1496.9 635.8 1491.8 624.9 1485.2 612.3C1478.6 599.8 1470.6 584.3 1467.3 578.0C1464.0 571.7 1457.2 558.9 1452.3 549.5C1447.3 540.1 1439.6 525.3 1435.0 516.5C1422.0 491.2 1419.0 486.0 1417.5 486.0C1416.8 486.0 1413.8 487.9 1410.8 490.3C1401.7 497.5 1387.7 506.4 1375.1 512.9C1370.3 515.3 1371.7 518.6 1394.5 561.0C1397.9 567.3 1403.5 577.9 1407.0 584.5C1425.7 620.4 1433.9 629.9 1450.7 635.4C1456.9 637.4 1460.0 637.6 1479.8 637.8C1493.1 638.0 1496.2 637.7 1496.6 636.6ZM1182.5 577.1C1200.9 559.2 1213.9 549.6 1231.3 540.9C1252.2 530.3 1271.9 523.4 1293.7 518.9C1326.1 512.3 1344.4 506.7 1363.9 497.4C1383.3 488.2 1403.9 473.2 1418.6 457.8C1425.5 450.4 1428.6 446.3 1438.6 431.0C1445.9 419.9 1456.3 393.4 1459.4 378.0C1461.5 367.9 1462.6 354.0 1461.3 354.0C1460.8 354.0 1458.5 357.7 1456.3 362.2C1444.6 386.0 1426.1 407.9 1402.8 425.5C1371.1 449.4 1344.2 460.6 1293.5 471.0C1282.5 473.3 1268.1 476.9 1261.5 479.1C1248.2 483.5 1229.2 492.6 1218.5 499.8C1212.1 504.1 1211.1 505.3 1206.7 513.5C1199.4 527.1 1191.1 542.8 1182.5 559.5C1178.2 567.8 1173.2 577.3 1171.4 580.8C1168.2 586.7 1167.2 590.0 1168.6 590.0C1169.0 590.0 1175.2 584.2 1182.5 577.1Z" fill="#f0a92b" /></g></svg></i><span>Афита</span></a>'+
    '<a class="home-btn dock-tools" href="./#tools">'+ico(I.tools)+'<span>Инструменты</span></a>'+
    (menu?'<button type="button" class="home-btn dock-menu" id="dockMenu" aria-expanded="false" aria-controls="mnav"><i class="dock-glass" aria-hidden="true"><span class="burger"></span></i><span class="dm-t">Меню</span></button>':'')+
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

/* Мобильное меню (01.11.2026): разделы раскрываются как выпадающие списки.
   Открыт только один раздел; после раскрытия меню прокручивается, чтобы были видны все подразделы.
   Плавность: высоту не анимируем (это пересчёт раскладки на каждом кадре). Раздел открывается сразу,
   а движение изображается сдвигом (transform) и прозрачностью — их считает видеокарта. */
(function(){
  var menu=document.getElementById('mnav');if(!menu)return;
  var groups=[].slice.call(menu.querySelectorAll('details.mg'));if(!groups.length)return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  var EASE='cubic-bezier(.2,.8,.25,1)',running=[];
  function stopAll(){running.forEach(function(a){try{a.finish()}catch(e){}});running=[]}
  function anim(el,frames,opt){if(!el.animate)return;var a=el.animate(frames,opt);running.push(a);return a}
  function reveal(d){
    var mr=menu.getBoundingClientRect(),r=d.getBoundingClientRect(),bottom=mr.bottom-8,delta=0;
    if(r.bottom>bottom)delta=r.bottom-bottom;
    if(r.top-delta<mr.top+8)delta=r.top-mr.top-8;
    if(Math.abs(delta)>1)menu.scrollBy({top:delta,behavior:reduce.matches?'auto':'smooth'});
  }
  function toggle(d){
    stopAll();
    var s=d.querySelector('summary'),b=d.querySelector('.mg-links');
    var opening=!d.open;
    var inner=d.parentElement,kids=[].slice.call(inner.children);
    /* FLIP: запоминаем положение всех пунктов, меняем раскладку разом, затем плавно «доезжаем» сдвигом */
    var before=kids.map(function(k){return k.getBoundingClientRect().top});
    var top0=s.getBoundingClientRect().top;
    groups.forEach(function(g){if(g!==d&&g.open)g.open=false});
    d.open=opening;
    /* нажатый заголовок остаётся под пальцем */
    menu.scrollTop+=s.getBoundingClientRect().top-top0;
    if(!reduce.matches){
      kids.forEach(function(k,i){var dy=before[i]-k.getBoundingClientRect().top;
        if(Math.abs(dy)>1)anim(k,[{transform:'translateY('+dy+'px)'},{transform:'none'}],{duration:opening?340:260,easing:EASE})});
      if(opening&&b)anim(b,[{opacity:0,transform:'translateY(-10px)'},{opacity:1,transform:'none'}],{duration:320,easing:EASE});
    }
    if(opening)setTimeout(function(){reveal(d)},reduce.matches?0:60);
  }
  groups.forEach(function(d){
    var s=d.querySelector('summary');if(!s)return;
    s.addEventListener('click',function(e){e.preventDefault();toggle(d)});
  });
})();
