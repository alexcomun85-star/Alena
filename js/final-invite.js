/* Content stays visible if observation or animation is unsupported. */
(function(){
 var items=document.querySelectorAll('[data-invite-reveal]');
 if(!items.length||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('invite-enter');observer.unobserve(entry.target)}})},{threshold:.12});
 items.forEach(function(item){observer.observe(item)});
})();
