/* «Мой зал» — избранные разделы сайта.
   Архитектура:
   - список разделов — js/sections.js (window.ALENA_SECTIONS), собирается из меню скриптом scripts/build_nav.py;
   - в хранилище лежат только стабильные ключи разделов (id): localStorage myzal_v2 = {v:2, ids:[...]};
   - меню не трогаем: кнопка «В Мой зал» ставится в заголовок страницы или раздела, управление — на moy-zal.html;
   - любая ошибка остаётся внутри модуля и не ломает остальной сайт. */
(function () {
  'use strict';
  try {
    var SECTIONS = Array.isArray(window.ALENA_SECTIONS) ? window.ALENA_SECTIONS : [];
    if (!SECTIONS.length) return;
    var KEY = 'myzal_v2', OLD = 'myzal_v1', MAX = 40;
    var BY = {};
    SECTIONS.forEach(function (s) { BY[s.id] = s; });

    function slug(h) {
      h = String(h || '');
      if (h.indexOf('./') === 0) h = h.slice(2);
      var i = h.indexOf('#'), page = i < 0 ? h : h.slice(0, i), anchor = i < 0 ? '' : h.slice(i);
      return (page.replace('.html', '') || 'index') + anchor;
    }
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return true; } catch (e) { return v === undefined ? null : false; } }

    /* загрузка с проверкой; перенос из первой версии (старые данные не удаляются) */
    function load() {
      var raw = store(KEY), ids = null;
      if (raw) { try { var x = JSON.parse(raw); if (x && Array.isArray(x.ids)) ids = x.ids; } catch (e) {} }
      if (!ids) {
        ids = [];
        var old = store(OLD);
        if (old) { try { var o = JSON.parse(old); if (Array.isArray(o)) o.forEach(function (i) { if (i && typeof i.h === 'string') ids.push(slug(i.h)); }); } catch (e) {} }
      }
      var seen = {};
      return ids.filter(function (id) { if (typeof id !== 'string' || !BY[id] || seen[id]) return false; seen[id] = 1; return true; }).slice(0, MAX);
    }
    var ids = load();
    function save() { return store(KEY, JSON.stringify({ v: 2, ids: ids })); }
    function has(id) { return ids.indexOf(id) >= 0; }

    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    var STAR = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

    var toastEl, toastT;
    function toast(html) {
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'zal-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
      toastEl.innerHTML = html; toastEl.classList.add('on');
      clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
    }
    function toggle(id) {
      var s = BY[id]; if (!s) return;
      var before = ids.slice(), removing = has(id);
      if (removing) { ids = ids.filter(function (x) { return x !== id; }); }
      else if (ids.length >= MAX) { toast('В Моём зале уже ' + MAX + ' разделов — уберите лишние'); return; }
      else { ids.push(id); }
      if (!save()) { ids = before; toast('Не удалось сохранить изменение. Прежнее избранное оставлено.'); }
      else { toast(removing ? '«' + esc(s.t) + '» убран из Моего зала' : '«' + esc(s.t) + '» — в <a href="moy-zal.html">Моём зале</a>'); }
      render();
    }

    /* кнопки «В Мой зал»: страница целиком — в заголовок, разделы с якорем — в их заголовок */
    var here = slug((location.pathname.split('/').pop() || 'index.html'));
    var toggles = [];
    function addToggle(id, host, small) {
      if (!host || !BY[id]) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'zal-toggle' + (small ? ' zal-toggle-s' : ''); b.dataset.id = id;
      b.innerHTML = STAR + '<span></span>';
      b.addEventListener('click', function () { toggle(id); });
      host.appendChild(b); toggles.push(b);
    }
    if (here !== 'moy-zal' && here !== 'index') {
      var hero = document.querySelector('.page-hero .w');
      if (BY[here] && hero) {
        var h1 = hero.querySelector('h1'), row = document.createElement('div');
        row.className = 'zal-row';
        if (h1 && h1.nextSibling) hero.insertBefore(row, h1.nextSibling); else hero.appendChild(row);
        addToggle(here, row, false);
      }
      SECTIONS.forEach(function (s) {
        var i = s.id.indexOf('#'); if (i < 0 || s.id.slice(0, i) !== here) return;
        var el = document.getElementById(s.id.slice(i + 1)); if (!el) return;
        var hd = el.querySelector('h2'); if (!hd) return;
        var row = document.createElement('div'); row.className = 'zal-row zal-row-s';
        hd.parentNode.insertBefore(row, hd.nextSibling);
        addToggle(s.id, row, true);
      });
    }

    function render() {
      var n = ids.length;
      toggles.forEach(function (b) {
        var on = has(b.dataset.id), s = BY[b.dataset.id];
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.querySelector('span').textContent = on ? 'В Моём зале' : 'В Мой зал';
        b.setAttribute('aria-label', (on ? 'Убрать из Моего зала: ' : 'Добавить в Мой зал: ') + s.t);
      });
      document.querySelectorAll('.zal-n').forEach(function (i) { i.hidden = !n; i.textContent = n; });
      var ml = document.querySelector('.m-zal-links');
      if (ml) ml.innerHTML = ids.map(function (id) { return '<a href="' + esc(BY[id].h) + '">' + esc(BY[id].t) + '</a>'; }).join('');
      var box = document.getElementById('zalList');
      if (box) {
        box.innerHTML = n ? ids.map(function (id, k) {
          var s = BY[id];
          return '<div class="zal-item"><a class="zal-go" href="' + esc(s.h) + '"><b>' + esc(s.t) + '</b><span>' + esc(s.d) + '</span></a><div class="zal-ctl">' +
            '<button type="button" data-act="up" data-k="' + k + '" aria-label="Выше: ' + esc(s.t) + '"' + (k === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" data-act="down" data-k="' + k + '" aria-label="Ниже: ' + esc(s.t) + '"' + (k === n - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button type="button" data-act="del" data-k="' + k + '" aria-label="Убрать: ' + esc(s.t) + '">×</button></div></div>';
        }).join('') : '<p class="zal-empty">Пока пусто. Отметьте разделы ниже или нажмите «В Мой зал» на странице раздела — он появится здесь.</p>';
      }
      var all = document.getElementById('zalAll');
      if (all) {
        var groups = {}, order = [];
        SECTIONS.forEach(function (s) { if (!groups[s.g]) { groups[s.g] = []; order.push(s.g); } groups[s.g].push(s); });
        all.innerHTML = order.map(function (g) {
          return '<div class="zal-group"><h3>' + esc(g) + '</h3><div class="zal-opts">' + groups[g].map(function (s) {
            var on = has(s.id);
            return '<button type="button" class="zal-opt' + (on ? ' on' : '') + '" data-id="' + esc(s.id) + '" aria-pressed="' + on + '">' + STAR + '<span><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></span></button>';
          }).join('') + '</div></div>';
        }).join('');
      }
    }

    var box = document.getElementById('zalList');
    if (box) box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var k = +b.dataset.k, a = b.dataset.act, focusK = k, before = ids.slice();
      if (a === 'del') { var t = BY[ids[k]].t; ids.splice(k, 1); focusK = Math.min(k, ids.length - 1); }
      else { var j = a === 'up' ? k - 1 : k + 1; if (j < 0 || j >= ids.length) return; var x = ids[k]; ids[k] = ids[j]; ids[j] = x; focusK = j; }
      if (!save()) { ids = before; focusK = k; toast('Не удалось сохранить изменение. Прежнее избранное оставлено.'); }
      else if (a === 'del') toast('«' + esc(t) + '» убран из Моего зала');
      render();
      var nb = box.querySelector('button[data-act="' + a + '"][data-k="' + focusK + '"]') || box.querySelector('button[data-k="' + focusK + '"]');
      if (nb && !nb.disabled) nb.focus();
    });
    var all = document.getElementById('zalAll');
    if (all) all.addEventListener('click', function (e) {
      var b = e.target.closest('.zal-opt'); if (!b) return;
      var id = b.dataset.id; toggle(id);
      var nb = all.querySelector('.zal-opt[data-id="' + id + '"]'); if (nb) nb.focus();
    });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { ids = load(); render(); } });
    render();
  } catch (err) {
    /* «Мой зал» не должен мешать остальному сайту */
    if (window.console) console.warn('Мой зал:', err);
  }
})();
