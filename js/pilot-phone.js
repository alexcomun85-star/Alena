/* Пилот: переписка в телефоне. Сообщения приходят по одному, лента плавно уезжает вверх.
   Плавность: анимируются только transform и opacity (видеокарта), без пересчёта раскладки на каждом кадре.
   Приём FLIP: добавили сообщение → лента мгновенно сдвинута вниз на его высоту → плавно возвращается.
   Без JS или при «уменьшить движение» видна вся переписка. */
(function () {
  var chat = document.querySelector('[data-chat]');
  if (!chat) return;
  var track = chat.querySelector('.cw-track');
  var status = document.querySelector('.phone [data-status]');
  var items = [].slice.call(track.children);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var EASE = 'cubic-bezier(.22,.8,.3,1)';
  var typing = document.createElement('p');
  typing.className = 'msg in al typing';
  typing.setAttribute('aria-hidden', 'true');
  typing.innerHTML = '<i></i><i></i><i></i>';

  var timers = [], running = false, visible = false;
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  /* вставить/показать элемент и плавно поднять ленту на его высоту */
  function slideIn(el, insertBefore) {
    if (insertBefore) track.insertBefore(el, insertBefore);
    el.hidden = false;
    var h = el.getBoundingClientRect().height + 7;          /* 7 — зазор между сообщениями */
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,' + h + 'px,0)';
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translate3d(0,8px,0) scale(.97)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        track.style.transition = 'transform .45s ' + EASE;
        track.style.transform = 'translate3d(0,0,0)';
        el.style.transition = 'opacity .35s ease, transform .45s ' + EASE;
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
  }
  /* убрать «печатает…» и сразу показать ответ: высота меняется на разницу, сдвиг тоже плавный */
  function swapTypingFor(el) {
    var th = typing.parentNode ? typing.getBoundingClientRect().height + 7 : 0;
    if (typing.parentNode) typing.parentNode.removeChild(typing);
    el.hidden = false;
    var h = el.getBoundingClientRect().height + 7 - th;
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,' + h + 'px,0)';
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translate3d(0,6px,0)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        track.style.transition = 'transform .4s ' + EASE;
        track.style.transform = 'translate3d(0,0,0)';
        el.style.transition = 'opacity .3s ease, transform .4s ' + EASE;
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
  }

  function reset() {
    items.forEach(function (el) { el.hidden = true; el.style.cssText = ''; });
    if (typing.parentNode) typing.parentNode.removeChild(typing);
    track.style.transition = 'none';
    track.style.transform = 'none';
    if (status) status.textContent = 'в сети';
  }

  function play() {
    if (running) return;
    running = true;
    clear(); reset();
    var t = 400;
    items.forEach(function (el) {
      if (el.classList.contains('al')) {
        later(function () { slideIn(typing, el); if (status) status.textContent = 'печатает…'; }, t);
        t += 1400;
        later(function () { swapTypingFor(el); if (status) status.textContent = 'в сети'; }, t);
        t += 1300;
      } else {
        later(function () { slideIn(el); }, t);
        t += el.classList.contains('msg-day') ? 600 : 1200;
      }
    });
    later(function () {
      running = false;
      if (!visible) return;
      track.style.transition = 'opacity .5s ease';
      track.style.opacity = '0';
      later(function () { track.style.opacity = ''; play(); }, 550);
    }, t + 4500);
  }

  reset();
  new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    if (visible && !running) play();
  }, { threshold: 0.35 }).observe(chat);
})();
