/* Пилот: переписка в телефоне «оживает» — сообщения приходят по одному,
   перед ответом Алёны видно «печатает…», лента уезжает вверх.
   Без JS или при «уменьшить движение» видна вся переписка (последние сообщения внизу). */
(function () {
  var chat = document.querySelector('[data-chat]');
  if (!chat) return;
  var track = chat.querySelector('.cw-track');
  var status = document.querySelector('.phone [data-status]');
  var items = [].slice.call(track.children);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var typing = document.createElement('p');
  typing.className = 'msg in al typing';
  typing.setAttribute('aria-hidden', 'true');
  typing.innerHTML = '<i></i><i></i><i></i>';

  var timers = [], running = false, visible = false;
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  function reset() {
    items.forEach(function (el) { el.classList.remove('shown'); el.classList.add('pending'); });
    if (typing.parentNode) typing.parentNode.removeChild(typing);
    if (status) status.textContent = 'в сети';
  }
  function show(el) { el.classList.remove('pending'); el.classList.add('shown'); }

  function play() {
    if (running) return;
    running = true;
    clear(); reset();
    var t = 500;
    items.forEach(function (el) {
      if (el.classList.contains('al')) {
        later(function () {
          track.insertBefore(typing, el);
          typing.classList.remove('shown'); void typing.offsetWidth; typing.classList.add('shown');
          if (status) status.textContent = 'печатает…';
        }, t);
        t += 1300;
        later(function () {
          if (typing.parentNode) typing.parentNode.removeChild(typing);
          if (status) status.textContent = 'в сети';
          show(el);
        }, t);
        t += 1100;
      } else {
        later(function () { show(el); }, t);
        t += el.classList.contains('msg-day') ? 500 : 1100;
      }
    });
    /* пауза на последнем кадре и повтор, пока блок на экране */
    later(function () {
      running = false;
      if (visible) { chat.classList.add('fade'); later(function () { chat.classList.remove('fade'); play(); }, 600); }
    }, t + 4500);
  }

  reset();
  new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    if (visible && !running) play();
  }, { threshold: 0.4 }).observe(chat);
})();
