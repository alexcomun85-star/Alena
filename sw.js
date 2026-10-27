/* ALENAFIT — работа как приложение и без интернета.
   Страницы: сначала сеть (чтобы обновления приходили сразу), без сети — сохранённая копия,
   а если копии нет — страница «Нет интернета». Данные журналов (localStorage) кеш не затрагивает.
   Стили, скрипты, картинки: сначала из кэша, в фоне обновляются. */
const VERSION = 'alenafit-v7';
const CORE = [
  './', './index.html', './servisy.html', './progress.html', './kalorii.html', './vozvrat.html',
  './zal.html', './korzina.html', './recepty.html', './golod.html', './pitanie.html', './offline.html', './moy-zal.html',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './img/brand/mark-light.svg', './img/brand/wordmark-light.svg', './img/brand/logo-light.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; /* внешние сервисы — без вмешательства */

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isData = url.pathname.includes('/data/');

  if (isPage || isData) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: isPage }).then(r => r || (isPage ? caches.match('./offline.html') : Response.error())))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
