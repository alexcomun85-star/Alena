/* Same-site cross-origin frame: authentication and API remain on the assistant host. */
(()=>{'use strict';
 const launch=document.querySelector('.afit-launch'),panel=document.querySelector('.afit-window');
 if(!launch||!panel)return;
 const close=panel.querySelector('.afit-close'),frame=panel.querySelector('iframe');let previous=launch;
 const tools=document.createElement('iframe');tools.title='Инструменты Афиты';tools.setAttribute('allow','microphone; clipboard-write');tools.hidden=true;tools.style.display='none';frame.after(tools);
 const tabs=document.createElement('nav');tabs.className='afit-tabs';tabs.setAttribute('aria-label','Режим помощника');
 ['Чат','Действия'].forEach((label,index)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(index===0));b.onclick=()=>{if(index&&!tools.getAttribute('src'))tools.src='assistant-tools.html?v=20261029pantry3';frame.hidden=!!index;frame.style.display=index?'none':'';tools.hidden=!index;tools.style.display=index?'block':'none';tabs.querySelectorAll('button').forEach((t,i)=>t.setAttribute('aria-pressed',String(i===index)))};tabs.append(b)});frame.before(tabs);
 // Only this same-origin tools frame can request switching; no automatic chat send.
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==tools.contentWindow||event.data?.type!=='afita:open-chat')return;
  tabs.querySelector('button').click();
  const note=panel.querySelector('.afit-access');
  if(note)note.textContent='Вопрос скопирован. Вставьте его в чат и отправьте. Ответ модели расходует лимит.';
 });
 const viewport=window.visualViewport;
 function fit(){
  if(!viewport||panel.hidden)return;
  if(matchMedia('(max-width:600px)').matches||viewport.height<innerHeight-100){
   panel.style.top=(viewport.offsetTop+8)+'px';
   panel.style.bottom='auto';
   panel.style.height=Math.max(120,Math.min(650,viewport.height-16))+'px';
  }else{panel.style.removeProperty('top');panel.style.removeProperty('bottom');panel.style.removeProperty('height')}
 }
 if(viewport){viewport.addEventListener('resize',fit);viewport.addEventListener('scroll',fit)}
 window.addEventListener('resize',fit);
 function hide(){panel.hidden=true;document.body.classList.remove('afit-chat-open');launch.setAttribute('aria-expanded','false');previous.focus()}
 function show(event){previous=event.currentTarget;panel.hidden=false;document.body.classList.add('afit-chat-open');launch.setAttribute('aria-expanded','true');if(!frame.src)frame.src='https://assistant.alenafit.com/?embed=1';fit();close.focus()}
 document.querySelectorAll('[data-open-afit]').forEach(button=>button.addEventListener('click',event=>{if(event.currentTarget===launch&&!panel.hidden)hide();else show(event)}));
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)hide()});
})();



