/* Progressive enhancement: the complete chart remains visible without JS. */
(function(){
 var el=document.querySelector('[data-pilot-motion]');
 if(!el||!('IntersectionObserver' in window))return;
 var reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
 if(reduced.matches)return;
 var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){el.classList.add('pilot-draw');observer.disconnect()}})},{threshold:.35});
 observer.observe(el);
 function stop(){if(reduced.matches){observer.disconnect();el.classList.remove('pilot-draw')}}
 if(reduced.addEventListener)reduced.addEventListener('change',stop);
})();
