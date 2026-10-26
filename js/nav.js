/* Мобильное меню: открывается кнопкой «Меню», закрывается повторным нажатием, Esc или выбором пункта. */
(function(){
  var btn=document.getElementById('menuBtn'),menu=document.getElementById('mnav');if(!btn||!menu)return;
  function set(open){menu.hidden=!open;btn.setAttribute('aria-expanded',open);document.body.classList.toggle('menu-open',open);btn.lastChild.textContent=open?'Закрыть':'Меню';if(open){var a=menu.querySelector('a');a&&a.focus()}}
  btn.addEventListener('click',function(){set(menu.hidden)});
  menu.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){set(false);btn.focus()}});
  var path=location.pathname.split('/').pop()||'index.html';
  menu.querySelectorAll('a[href]').forEach(function(a){var h=a.getAttribute('href');if((h===path)||(h==='./'&&(path==='index.html'||path==='')))a.setAttribute('aria-current','page')});
})();
