/* Пилот: переходы по разделам на главной (кнопка «Инструменты», меню, подвал).
   Окно раздела встаёт ровно под шапку с одинаковым отступом. Если над ним догрузились
   картинки и страница сдвинулась, позиция поправляется после прокрутки. */
(function () {
  var GAP = 12;
  function headerBottom() {
    var h = document.querySelector('header');
    if (!h) return 0;
    var cs = getComputedStyle(h);
    if (cs.position !== 'sticky' && cs.position !== 'fixed') return 0;
    return Math.max(0, h.getBoundingClientRect().bottom);
  }
  function targetOf(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var sec = el.closest('main>section') || el;
    var win = (sec === el) ? (sec.querySelector(':scope>.w') || sec) : el;
    return win;
  }
  function yFor(el) { return window.scrollY + el.getBoundingClientRect().top - headerBottom() - GAP; }
  function go(id, smooth) {
    var el = targetOf(id);
    if (!el) return false;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: yFor(el), behavior: smooth && !reduce ? 'smooth' : 'auto' });
    /* поправка, если раскладка над разделом изменилась во время прокрутки */
    var tries = 0;
    (function fix() {
      setTimeout(function () {
        var d = el.getBoundingClientRect().top - headerBottom() - GAP;
        if (Math.abs(d) > 2) window.scrollTo({ top: window.scrollY + d, behavior: 'auto' });
        if (++tries < 3) fix();
      }, tries ? 400 : 900);
    })();
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a || a.classList.contains('skip-link') || /#top$/.test(a.getAttribute('href'))) return;
    var href = a.getAttribute('href');
    /* «#раздел», «./#раздел» и «index.html#раздел» — разделы этой главной */
    var m = href.match(/^(?:\.\/|index\.html|\.\/index\.html)?#(.+)$/);
    if (!m || !document.getElementById(decodeURIComponent(m[1]))) return;
    var u = { hash: '#' + m[1] };
    if (go(decodeURIComponent(u.hash.slice(1)), true)) {
      e.preventDefault();
      try { history.replaceState(null, '', u.hash); } catch (err) {}
    }
  });
  if (location.hash.length > 1) window.addEventListener('load', function () { go(decodeURIComponent(location.hash.slice(1)), false); });
})();
