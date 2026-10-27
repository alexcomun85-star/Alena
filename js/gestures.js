/* Жесты: назад свайпом от левого края, закрытие меню свайпом, карусели карточек, вкладки свайпом. */
(function(){
  var touch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  var path=location.pathname.split('/').pop()||'index.html';
  function goBack(){if(history.length>1)history.back();else location.href='./'}

  /* 1. Кнопка «назад» в режиме приложения (кроме главной) */
  if(standalone&&path!=='index.html'&&path!==''){
    var bar=document.querySelector('.bar .w');
    if(bar){var b=document.createElement('button');b.type='button';b.className='app-back';b.setAttribute('aria-label','Назад');b.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';b.addEventListener('click',goBack);bar.insertBefore(b,bar.firstChild)}
  }

  if(!touch)return;

  /* 2. Свайп вправо от левого края — назад */
  var ind=document.createElement('div');ind.className='edge-back';ind.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';document.body.appendChild(ind);
  var sx=0,sy=0,edge=false,dx=0;
  document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;dx=0;edge=sx<28&&path!=='index.html'&&!document.body.classList.contains('menu-open')},{passive:true});
  document.addEventListener('touchmove',function(e){if(!edge)return;var t=e.touches[0];dx=t.clientX-sx;var dy=Math.abs(t.clientY-sy);if(dy>60){edge=false;ind.style.transform='';return}if(dx>0){ind.style.transform='translate('+Math.min(dx,90)/90*64+'px,-50%)';ind.classList.toggle('ready',dx>80)}},{passive:true});
  document.addEventListener('touchend',function(){if(edge&&dx>80)goBack();edge=false;ind.style.transform='';ind.classList.remove('ready')},{passive:true});

  /* 3. Меню: свайп вниз (когда меню прокручено к началу) или вправо — закрыть */
  var menu=document.getElementById('mnav'),mb=document.getElementById('dockMenu')||document.getElementById('menuBtn');
  if(menu&&mb){var mx=0,my=0,top0=false;
    menu.addEventListener('touchstart',function(e){var t=e.touches[0];mx=t.clientX;my=t.clientY;top0=menu.scrollTop<=0},{passive:true});
    menu.addEventListener('touchend',function(e){var t=e.changedTouches[0],ddx=t.clientX-mx,ddy=t.clientY-my;
      if((ddx>90&&Math.abs(ddy)<60)||(top0&&ddy>110&&Math.abs(ddx)<60)){if(!menu.hidden)mb.click()}},{passive:true});
  }

  /* 4. Вкладки свайпом: контейнер с data-swipe-tabs="имя группы радиокнопок" */
  document.querySelectorAll('[data-swipe-tabs]').forEach(function(el){
    var name=el.getAttribute('data-swipe-tabs'),x0=0,y0=0;
    el.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
    el.addEventListener('touchend',function(e){var t=e.changedTouches[0],ddx=t.clientX-x0,ddy=t.clientY-y0;if(Math.abs(ddx)<60||Math.abs(ddy)>Math.abs(ddx))return;
      var rs=[].slice.call(document.querySelectorAll('input[name="'+name+'"]')),i=rs.findIndex(function(r){return r.checked});
      var n=rs[(i+(ddx<0?1:-1)+rs.length)%rs.length];if(n){n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}))}},{passive:true});
  });
})();

/* 5. Карусели карточек на телефоне (точки-индикаторы) — работает и без тача */
(function(){
  var SEL='.rc-list,.path-grid,.myth-grid,.acc-grid,.hub3,.lvl-grid,.inv-grid';
  var mq=window.matchMedia('(max-width:719px)');
  function setup(){
    document.querySelectorAll(SEL).forEach(function(el){
      if(el.closest('.dd-panel,.mnav'))return;
      var kids=el.children.length;if(kids<2)return;
      if(!mq.matches){el.classList.remove('swipe');var d0=el.nextElementSibling;if(d0&&d0.classList.contains('sw-dots'))d0.hidden=true;return}
      el.classList.add('swipe');
      var dots=el.nextElementSibling;
      if(!dots||!dots.classList.contains('sw-dots')){dots=document.createElement('div');dots.className='sw-dots';dots.setAttribute('aria-hidden','true');el.after(dots)}
      dots.hidden=false;
      if(dots.children.length!==kids){dots.innerHTML='';for(var i=0;i<kids;i++)dots.appendChild(document.createElement('i'))}
      function upd(){var w=el.firstElementChild.getBoundingClientRect().width+12,idx=Math.round(el.scrollLeft/w);[].forEach.call(dots.children,function(d,j){d.classList.toggle('on',j===Math.min(idx,kids-1))})}
      if(!el._sw){el._sw=1;el.addEventListener('scroll',function(){cancelAnimationFrame(el._raf);el._raf=requestAnimationFrame(upd)},{passive:true})}
      upd();
    });
  }
  /* рецепты рисуются скриптом — ждём */
  window.addEventListener('load',setup);document.addEventListener('DOMContentLoaded',setup);
  if(mq.addEventListener)mq.addEventListener('change',setup);
  setTimeout(setup,800);
})();
