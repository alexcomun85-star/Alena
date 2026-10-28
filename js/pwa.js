/* Установка сайта как приложения: регистрация сервис-воркера и кнопка «Установить». */
(function(){
  if('serviceWorker' in navigator){window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(reg){
      function warm(){if(reg.active)reg.active.postMessage({type:'CACHE_MEDIA'})}
      if(window.requestIdleCallback)window.requestIdleCallback(warm,{timeout:5000});else setTimeout(warm,2500);
    }).catch(function(){})
  })}
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  var btns=[].slice.call(document.querySelectorAll('[data-pwa]'));
  if(standalone){btns.forEach(function(b){b.hidden=true});return}
  var ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(/macintosh/i.test(ua)&&'ontouchend' in document);
  var deferred=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;btns.forEach(function(b){b.hidden=false})});
  window.addEventListener('appinstalled',function(){btns.forEach(function(b){b.hidden=true});deferred=null});
  if(ios)btns.forEach(function(b){b.hidden=false});
  function sheet(html){
    var d=document.createElement('div');d.className='pwa-sheet';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
    d.innerHTML='<div class="pwa-card"><button type="button" class="pwa-x" aria-label="Закрыть">×</button>'+html+'</div>';
    document.body.appendChild(d);
    function close(){d.remove()}
    d.addEventListener('click',function(e){if(e.target===d||e.target.closest('.pwa-x'))close()});
    document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
    d.querySelector('.pwa-x').focus();
  }
  /* Samsung Internet и Яндекс Браузер собирают из сайта отдельное приложение (WebAPK) на своих серверах,
     и Google Play Защита иногда его блокирует. Запасной путь — простой ярлык: на этом устройстве
     сайт перестаёт отдавать браузеру манифест, и «Добавить на главный экран» создаёт обычную иконку. */
  var SK='pwa_shortcut';
  function getSK(){try{return localStorage.getItem(SK)==='1'}catch(e){return false}}
  function setSK(v){try{v?localStorage.setItem(SK,'1'):localStorage.removeItem(SK)}catch(e){}}
  var menuPath=function(samsung){return samsung?'<b>☰</b> внизу справа → <b>«Добавить страницу на»</b> → <b>«Главный экран»</b>':'<b>⋮</b> → <b>«Добавить ярлык»</b> (или <b>«На главный экран»</b>)'};
  function shortcutSheet(samsung){
    if(getSK()){
      sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Ярлык ALENAFIT</h3><ol><li>Откройте меню браузера: '+menuPath(samsung)+'.</li><li>Подтвердите добавление.</li></ol><p>Иконка появится на рабочем столе и будет открывать сайт в браузере. Инструменты и записи работают так же, а открытые раньше страницы — и без интернета.</p><button type="button" class="tbtn ghost pwa-mode" data-mode="app">Вернуть установку как приложение</button>');
    }else{
      sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Установить ALENAFIT</h3><ol><li>Откройте меню браузера: '+menuPath(samsung).replace('«Главный экран»','«Приложения» или «Главный экран»')+'.</li><li>Если появилось окно установки — нажмите <b>«Установить»</b> или <b>«Добавить»</b>.</li></ol><p><b>Не устанавливается</b> или телефон пишет «Приложение заблокировано Play Защитой»? Это ограничение браузера, а не сайта. Есть два надёжных варианта:</p><button type="button" class="tbtn pwa-mode" data-mode="shortcut">Сделать простой ярлык</button><p class="small">Или откройте alenafit.com в <b>Chrome</b> → <b>⋮</b> → <b>«Установить приложение»</b>.</p>');
    }
    var card=document.querySelector('.pwa-sheet .pwa-card');
    card&&card.addEventListener('click',function(e){var b=e.target.closest('.pwa-mode');if(!b)return;
      setSK(b.dataset.mode==='shortcut');try{sessionStorage.setItem('pwa_show','1')}catch(e2){}location.reload()});
  }
  var again=false;try{again=sessionStorage.getItem('pwa_show')==='1';sessionStorage.removeItem('pwa_show')}catch(e){}
  if(again)setTimeout(function(){shortcutSheet(/SamsungBrowser/i.test(ua))},300);
  btns.forEach(function(b){b.addEventListener('click',function(){
    if(deferred){deferred.prompt();deferred.userChoice.finally(function(){deferred=null});return}
    if(ios){sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Установить ALENAFIT</h3><ol><li>Нажмите кнопку <b>«Поделиться»</b> внизу экрана Safari — квадрат со стрелкой вверх.</li><li>Выберите <b>«На экран «Домой»»</b>.</li><li>Нажмите <b>«Добавить»</b>.</li></ol><p>Иконка появится на рабочем столе, сайт будет открываться как приложение.</p>');return}
    var samsung=/SamsungBrowser/i.test(ua),yandex=/YaBrowser/i.test(ua);
    if(samsung||yandex){shortcutSheet(samsung);return}
    sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Установить ALENAFIT</h3><ol><li>Откройте сайт в <b>Chrome</b>.</li><li>Нажмите <b>⋮</b> в правом верхнем углу → <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li></ol><p>Иконка появится на рабочем столе, сайт будет открываться как приложение. Если пользуетесь другим браузером и телефон предупредит о защите — выберите «Добавить ярлык» или установите через Chrome.</p>');
  })});
})();
