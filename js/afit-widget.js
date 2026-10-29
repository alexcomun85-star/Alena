/* Same-site cross-origin frame: authentication and API remain on the assistant host. */
(()=>{'use strict';
 const launch=document.querySelector('.afit-launch'),panel=document.querySelector('.afit-window');
 if(!launch||!panel)return;
 const close=panel.querySelector('.afit-close'),frame=panel.querySelector('iframe');let previous=launch;
 function hide(){panel.hidden=true;launch.setAttribute('aria-expanded','false');previous.focus()}
 function show(event){previous=event.currentTarget;panel.hidden=false;launch.setAttribute('aria-expanded','true');if(!frame.src)frame.src='https://assistant.alenafit.com/';close.focus()}
 document.querySelectorAll('[data-open-afit]').forEach(button=>button.addEventListener('click',event=>{if(event.currentTarget===launch&&!panel.hidden)hide();else show(event)}));
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)hide()});
})();
