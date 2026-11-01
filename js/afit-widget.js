/* Афита на сайте: кнопка, окно и вкладки «Чат / Задачи».
   Чат — отдельный сайт assistant.alenafit.com (авторизация и API там), «Задачи» — assistant-tools.html.
   Анимация: окно раскрывается из кнопки и сворачивается в неё; на телефоне это лист снизу,
   который закрывается свайпом вниз. При «уменьшить движение» всё без анимации. */
(()=>{'use strict';
 const launch=document.querySelector('.afit-launch'),panel=document.querySelector('.afit-window');
 if(!launch||!panel)return;
 const close=panel.querySelector('.afit-close'),frame=panel.querySelector('iframe'),body=panel.querySelector('.afit-body')||panel;
 const loading=panel.querySelector('.afit-loading'),fallback=panel.querySelector('.afit-fallback'),header=panel.querySelector('header');
 const nudge=document.querySelector('.afit-nudge');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width:599px)');
 let previous=launch,closingTimer=0,failTimer=0;

 /* «Задачи» — второй фрейм, создаётся при первом переключении; чат при этом не перезагружается */
 const tools=document.createElement('iframe');tools.title='Инструменты Афиты';tools.setAttribute('allow','microphone');tools.hidden=true;tools.style.display='none';frame.after(tools);
 const tabs=document.createElement('nav');tabs.className='afit-tabs';tabs.setAttribute('aria-label','Режим помощника');
 ['Чат','Задачи'].forEach((label,index)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(index===0));
  b.onclick=()=>{if(b.getAttribute('aria-pressed')==='true')return;
   if(index&&!tools.getAttribute('src'))tools.src='assistant-tools.html?embed=1&v=20261101a2';
   frame.hidden=!!index;frame.style.display=index?'none':'';tools.hidden=!index;tools.style.display=index?'block':'none';
   if(loading)loading.hidden=!!index||frame.dataset.ready==='1';
   tabs.querySelectorAll('button').forEach((t,i)=>t.setAttribute('aria-pressed',String(i===index)));
   tabs.style.setProperty('--x',index?'100%':'0%')};
  tabs.append(b)});
 (panel.querySelector('.afit-title')||close).after(tabs);

 /* чат загрузился — убрать «открывает чат…»; не загрузился за 10 с — показать запасную ссылку */
 frame.addEventListener('load',()=>{if(!frame.getAttribute('src'))return;frame.dataset.ready='1';clearTimeout(failTimer);if(loading)loading.hidden=true;if(fallback)fallback.hidden=true});

 /* клавиатура на телефоне: окно по высоте видимой области */
 const viewport=window.visualViewport;
 function fit(){
  if(!viewport||panel.hidden)return;
  if(phone.matches){panel.style.top=Math.round(viewport.offsetTop+8)+'px';panel.style.bottom='auto';panel.style.height=Math.round(viewport.height-8)+'px'}
  else if(viewport.height<innerHeight-100){panel.style.top=(viewport.offsetTop+8)+'px';panel.style.bottom='auto';panel.style.height=Math.max(120,Math.min(680,viewport.height-16))+'px'}
  else{panel.style.removeProperty('top');panel.style.removeProperty('bottom');panel.style.removeProperty('height')}
 }
 if(viewport){viewport.addEventListener('resize',fit);viewport.addEventListener('scroll',fit)}
 addEventListener('resize',fit);

 /* окно растёт из кнопки: точка начала анимации — центр кнопки */
 function origin(){const l=(previous&&previous.getBoundingClientRect().width?previous:launch).getBoundingClientRect(),p=panel.getBoundingClientRect();
  panel.style.setProperty('--ox',Math.round(l.left+l.width/2-p.left)+'px');panel.style.setProperty('--oy',Math.round(l.top+l.height/2-p.top)+'px')}

 function finish(){panel.hidden=true;panel.inert=false;panel.classList.remove('is-closing');panel.style.removeProperty('transform');panel.style.removeProperty('transition');document.body.classList.remove('afit-chat-open');previous.focus()}
 function hide(immediate=false){if(panel.hidden||panel.classList.contains('is-closing'))return;document.querySelectorAll('[data-open-afit]').forEach(b=>b.setAttribute('aria-expanded','false'));panel.inert=true;
  if(immediate||reduced.matches)finish();else{panel.classList.add('is-closing');closingTimer=setTimeout(finish,phone.matches?260:220)}}
 function show(event){clearTimeout(closingTimer);hideNudge();panel.inert=false;panel.classList.remove('is-closing');previous=event.currentTarget;panel.hidden=false;
  document.body.classList.add('afit-chat-open');document.querySelectorAll('[data-open-afit]').forEach(b=>b.setAttribute('aria-expanded',String(b===previous||b===launch&&previous===launch)));
  if(!frame.getAttribute('src')){frame.src='https://assistant.alenafit.com/?embed=1';if(loading)loading.hidden=false;
   failTimer=setTimeout(()=>{if(frame.dataset.ready!=='1'&&fallback)fallback.hidden=false},10000)}
  fit();origin();
  if(!reduced.matches){panel.classList.remove('is-opening');void panel.offsetWidth;panel.classList.add('is-opening')}
  close.focus({preventScroll:true})}
 panel.addEventListener('animationend',e=>{if(e.target===panel)panel.classList.remove('is-opening')});

 /* кнопок две: капсула в углу (ПК) и центр нижней панели (телефон, Fold); панель создаёт nav.js раньше этого скрипта */
 document.querySelectorAll('[data-open-afit]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();if(!panel.hidden)hide();else show(event)}));
 close.addEventListener('click',()=>hide());
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)hide(true)});

 /* телефон: лист закрывается свайпом вниз за шапку */
 if(header){let y0=null,dy=0;
  header.addEventListener('touchstart',e=>{if(!phone.matches||e.target.closest('button'))return;y0=e.touches[0].clientY;dy=0;panel.style.transition='none'},{passive:true});
  header.addEventListener('touchmove',e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);panel.style.transform='translate3d(0,'+dy+'px,0)'},{passive:true});
  header.addEventListener('touchend',()=>{if(y0===null)return;y0=null;panel.style.transition='transform .25s cubic-bezier(.2,.8,.3,1)';
   if(dy>110){panel.style.transform='translate3d(0,100%,0)';launch.setAttribute('aria-expanded','false');panel.inert=true;setTimeout(finish,250)}
   else{panel.style.transform='';setTimeout(()=>panel.style.removeProperty('transition'),260)}})}

 /* кнопка: знак изредка «перерисовывается» — спокойный знак «я здесь» (3 раза за визит) */
 const stroke=launch.querySelector('.afit-stroke');
 if(stroke&&!reduced.matches){let n=0;const t=setInterval(()=>{if(++n>3||!panel.hidden){if(n>3)clearInterval(t);return}
  stroke.classList.remove('draw');void stroke.getBoundingClientRect();stroke.classList.add('draw')},14000)}

 /* ПК: при прокрутке капсула сворачивается в круг, после остановки раскрывается */
 let st=0;addEventListener('scroll',()=>{if(phone.matches||innerWidth<1024)return;launch.classList.add('is-compact');clearTimeout(st);st=setTimeout(()=>launch.classList.remove('is-compact'),900)},{passive:true});

 /* одна подсказка за визит: через 20 с, если окно не открывали; исчезает сама */
 function hideNudge(){if(nudge&&!nudge.hidden){nudge.classList.add('out');setTimeout(()=>{nudge.hidden=true;nudge.classList.remove('out')},250)}}
 let seen=false;try{seen=sessionStorage.getItem('afit_nudge')==='1'}catch(e){}
 if(nudge&&!seen)setTimeout(()=>{if(!panel.hidden||document.hidden)return;nudge.hidden=false;try{sessionStorage.setItem('afit_nudge','1')}catch(e){}
  nudge.onclick=()=>{const d=document.querySelector('.dock-afit');(d&&d.offsetParent?d:launch).click()};setTimeout(hideNudge,7000)},20000);
})();
