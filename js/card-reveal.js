/* Animate only after the element is fully inside the unobscured viewport. */
(()=>{'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||!('requestAnimationFrame'in window))return;
 const selectors=['#who .who article','#how .step','#plans .offer','#plans .plan','#plans .price-card','#tools .cat','#research .ev','.demo-card'];
 const elements=[...new Set(document.querySelectorAll(selectors.join(',')))];
 if(!elements.length)return;
 const final=document.querySelector('.invite-copy');let finalPlayed=false,finalTimer=0;
 const pending=new Map();let frame=0,stopped=false;
 if(final)final.classList.add('final-sequence-wait');
 function playFinal(immediate){if(!final||finalPlayed)return;clearTimeout(finalTimer);finalPlayed=true;final.classList.remove('final-sequence-wait');if(!immediate)final.classList.add('final-sequence-play');final.dataset.revealPlayed='true';}
 function fits(rect,top,bottom){if(bottom<=top||rect.height<=0)return false;const entered=Math.min(64,rect.height*.2);return rect.top<=bottom-entered&&rect.bottom>=top+Math.min(24,rect.height*.1);}
 function finalRect(){return (final?.querySelector('#inviteTitle')||final).getBoundingClientRect();}
 function bounds(){const vh=window.visualViewport?.height||innerHeight;let top=12,bottom=vh-16;document.querySelectorAll('header,.dock,.mobile-dock,.bottom-dock').forEach(el=>{const st=getComputedStyle(el);if(!['fixed','sticky'].includes(st.position)||st.display==='none')return;const r=el.getBoundingClientRect();if(r.top<=1&&r.bottom>0)top=Math.max(top,r.bottom+12);if(r.bottom>=vh-1&&r.top>vh/2)bottom=Math.min(bottom,r.top-12)});return {top,bottom};}
 function show(el){const state=pending.get(el);if(!state)return;clearTimeout(state.timer);pending.delete(el);el.classList.remove('card-wait');el.classList.add('card-arrive');el.dataset.revealPlayed='true';el.addEventListener('animationend',()=>el.classList.remove('card-arrive'),{once:true});}
 function check(){frame=0;if(stopped)return;const b=bounds();if(final&&!finalPlayed){if(!fits(finalRect(),b.top,b.bottom)){clearTimeout(finalTimer);finalTimer=0}else if(!finalTimer){finalTimer=setTimeout(()=>{finalTimer=0;const current=bounds();if(document.visibilityState!=='hidden'&&fits(finalRect(),current.top,current.bottom))playFinal(false)},160)}}let rank=0;pending.forEach((state,el)=>{if(!fits(el.getBoundingClientRect(),b.top,b.bottom)){clearTimeout(state.timer);state.timer=0;return}if(state.timer)return;const delay=100+(rank++%4)*150;state.timer=setTimeout(()=>{state.timer=0;if(document.visibilityState==='hidden')return;const current=bounds();if(fits(el.getBoundingClientRect(),current.top,current.bottom))show(el)},delay)});}
 function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(check)}
 elements.forEach(el=>{el.classList.add('card-wait');pending.set(el,{timer:0})});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);document.addEventListener('load',schedule,true);document.fonts?.ready.then(schedule);document.addEventListener('focusin',e=>{if(final?.contains(e.target))playFinal(true);for(const el of pending.keys())if(el===e.target||el.contains(e.target))show(el)});document.addEventListener('toggle',schedule,true);
 function stop(){stopped=true;clearTimeout(finalTimer);if(final){final.classList.remove('final-sequence-wait','final-sequence-play');finalPlayed=true}if(frame)cancelAnimationFrame(frame);pending.forEach((state,el)=>{clearTimeout(state.timer);el.classList.remove('card-wait','card-arrive')});pending.clear();elements.forEach(el=>el.classList.remove('card-arrive'));removeEventListener('scroll',schedule);removeEventListener('resize',schedule)}
 if('ResizeObserver'in window){const layoutObserver=new ResizeObserver(schedule);elements.forEach(el=>layoutObserver.observe(el));if(final)layoutObserver.observe(final)}
 reduced.addEventListener('change',()=>{if(reduced.matches)stop()});schedule();
})();
