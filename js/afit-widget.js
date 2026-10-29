/* Same-site cross-origin frame: authentication and API remain on the assistant host. */
(()=>{'use strict';
 const launch=document.querySelector('.afit-launch'),panel=document.querySelector('.afit-window');
 if(!launch||!panel)return;
 const close=panel.querySelector('.afit-close'),frame=panel.querySelector('iframe');let previous=launch;
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



