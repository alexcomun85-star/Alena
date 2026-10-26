/* Установка сайта как приложения: регистрация сервис-воркера и кнопка «Установить». */
(function(){
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
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
  btns.forEach(function(b){b.addEventListener('click',function(){
    if(deferred){deferred.prompt();deferred.userChoice.finally(function(){deferred=null});return}
    if(ios){sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Установить ALENAFIT</h3><ol><li>Нажмите кнопку <b>«Поделиться»</b> внизу экрана Safari — квадрат со стрелкой вверх.</li><li>Выберите <b>«На экран «Домой»»</b>.</li><li>Нажмите <b>«Добавить»</b>.</li></ol><p>Иконка появится на рабочем столе, сайт будет открываться как приложение.</p>');return}
    sheet('<img src="icons/icon-192.png" alt="" width="64" height="64"><h3>Установить ALENAFIT</h3><ol><li>Откройте меню браузера — <b>⋮</b> или <b>☰</b> (вверху или внизу экрана, в зависимости от браузера).</li><li>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li></ol><p>Иконка появится на рабочем столе, сайт будет открываться как приложение.</p>');
  })});
})();
