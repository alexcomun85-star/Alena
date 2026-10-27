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
  d.innerHTML='<div class="w"><a class="home-btn" href="./" aria-label="На главную"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg><span>Главная</span></a><a class="home-btn zal-dock" href="moy-zal.html" aria-label="Мой зал"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg><span>Мой зал</span><i class="zal-n" hidden></i></a><a class="btn btn-main" href="https://t.me/Gym_mom1988" target="_blank" rel="noopener">Написать «СТАРТ»</a></div>';
  document.body.appendChild(d);
})();


/* «Мой зал»: избранные разделы меню. Хранятся только в этом браузере (localStorage myzal_v1). */
(function(){
  var KEY='myzal_v1',STAR='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
  function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  /* все разделы — из мобильного меню, оно есть на каждой странице */
  var ALL=[];
  document.querySelectorAll('.mnav .mg').forEach(function(g){var gn=(g.querySelector('summary span')||{}).textContent||'';
    g.querySelectorAll('.mg-links a').forEach(function(a){var h=a.getAttribute('href');if(!h||/^https?:/.test(h))return;
      ALL.push({h:h,t:(a.querySelector('b')||a).textContent.trim(),d:(a.querySelector('span')||{textContent:''}).textContent.trim(),g:gn.trim()})})});
  function find(h){for(var i=0;i<ALL.length;i++)if(ALL[i].h===h)return ALL[i];return null}
  function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(function(i){return i&&typeof i.h==='string'&&typeof i.t==='string'}):[]}catch(e){return []}}
  var L=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(L));return true}catch(e){return false}}
  function has(h){return L.some(function(i){return i.h===h})}
  var toastT;
  function toast(t){var el=document.querySelector('.zal-toast');if(!el){el=document.createElement('div');el.className='zal-toast';el.setAttribute('role','status');document.body.appendChild(el)}
    el.innerHTML=t;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){el.classList.remove('on')},2400)}
  function toggle(h){var it=find(h)||L.filter(function(i){return i.h===h})[0];if(!it)return;
    if(has(h)){L=L.filter(function(i){return i.h!==h});save();toast('«'+esc(it.t)+'» убран из Моего зала')}
    else{L.push({h:it.h,t:it.t,d:it.d});if(save())toast('«'+esc(it.t)+'» — в <a href="moy-zal.html">Моём зале</a>');else toast('Браузер не дал сохранить — проверьте, не включён ли режим инкогнито')}
    render()}
  /* звёздочки у пунктов меню */
  document.querySelectorAll('.tnav .dd-link,.mnav .mg-links a').forEach(function(a){var h=a.getAttribute('href');if(!h||/^https?:/.test(h))return;
    var w=document.createElement('div');w.className='pin-wrap';a.parentNode.insertBefore(w,a);w.appendChild(a);
    var b=document.createElement('button');b.type='button';b.className='pin';b.dataset.h=h;b.innerHTML=STAR;w.appendChild(b);
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(h)})});
  function render(){
    var n=L.length;
    document.querySelectorAll('.pin').forEach(function(b){var on=has(b.dataset.h),it=find(b.dataset.h);b.setAttribute('aria-pressed',on);b.classList.toggle('on',on);
      var lbl=(on?'Убрать из Моего зала: ':'Добавить в Мой зал: ')+(it?it.t:'');b.setAttribute('aria-label',lbl);b.title=on?'Убрать из Моего зала':'Добавить в Мой зал'});
    document.querySelectorAll('.zal-n').forEach(function(i){i.hidden=!n;i.textContent=n});
    var ml=document.querySelector('.m-zal-links');
    if(ml)ml.innerHTML=L.map(function(i){return '<a href="'+esc(i.h)+'">'+esc(i.t)+'</a>'}).join('');
    var box=document.getElementById('zalList');
    if(box){
      box.innerHTML=n?L.map(function(i,k){return '<div class="zal-item"><a class="zal-go" href="'+esc(i.h)+'"><b>'+esc(i.t)+'</b><span>'+esc(i.d||'')+'</span></a><div class="zal-ctl">'+
        '<button type="button" data-act="up" data-k="'+k+'" aria-label="Выше: '+esc(i.t)+'"'+(k===0?' disabled':'')+'>↑</button>'+
        '<button type="button" data-act="down" data-k="'+k+'" aria-label="Ниже: '+esc(i.t)+'"'+(k===n-1?' disabled':'')+'>↓</button>'+
        '<button type="button" data-act="del" data-k="'+k+'" aria-label="Убрать: '+esc(i.t)+'">×</button></div></div>'}).join(''):
        '<p class="zal-empty">Пока пусто. Отметьте разделы ниже или нажмите ☆ рядом с пунктом в меню — они появятся здесь.</p>';
    }
    var all=document.getElementById('zalAll');
    if(all){var gs={},order=[];ALL.forEach(function(i){if(!gs[i.g]){gs[i.g]=[];order.push(i.g)}gs[i.g].push(i)});
      all.innerHTML=order.map(function(g){return '<div class="zal-group"><h3>'+esc(g)+'</h3><div class="zal-opts">'+gs[g].map(function(i){var on=has(i.h);
        return '<button type="button" class="zal-opt'+(on?' on':'')+'" data-h="'+esc(i.h)+'" aria-pressed="'+on+'">'+STAR+'<span><b>'+esc(i.t)+'</b><small>'+esc(i.d)+'</small></span></button>'}).join('')+'</div></div>'}).join('');
    }
  }
  var box=document.getElementById('zalList');
  if(box)box.addEventListener('click',function(e){var b=e.target.closest('button[data-act]');if(!b)return;var k=+b.dataset.k,a=b.dataset.act;
    if(a==='del'){var t=L[k].t;L.splice(k,1);save();toast('«'+esc(t)+'» убран из Моего зала')}
    else{var j=a==='up'?k-1:k+1;if(j<0||j>=L.length)return;var x=L[k];L[k]=L[j];L[j]=x;save()}
    render();var nb=box.querySelector('button[data-act="'+a+'"][data-k="'+(a==='up'?Math.max(0,k-1):a==='down'?Math.min(L.length-1,k+1):Math.min(k,L.length-1))+'"]');if(nb&&!nb.disabled)nb.focus()});
  var all=document.getElementById('zalAll');
  if(all)all.addEventListener('click',function(e){var b=e.target.closest('.zal-opt');if(!b)return;toggle(b.dataset.h);var nb=all.querySelector('.zal-opt[data-h="'+b.dataset.h+'"]');nb&&nb.focus()});
  /* синхронизация между вкладками */
  window.addEventListener('storage',function(e){if(e.key===KEY){L=load();render()}});
  render();
})();
