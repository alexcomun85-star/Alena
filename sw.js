/* ALENAFIT — работа как приложение и без интернета.
   Страницы: сначала сеть (чтобы обновления приходили сразу), без сети — сохранённая копия,
   а если копии нет — страница «Нет интернета». Данные журналов (localStorage) кеш не затрагивает.
   Стили, скрипты, картинки: сначала из кэша, в фоне обновляются. */
const VERSION = 'alenafit-v12';
// CSS/JS адреса совпадают с подключениями страниц, включая версию кэша.
const CORE = [
  "./",
  "./404.html",
  "./blizost.html",
  "./css/site.css?v=20261028a",
  "./gadzhety.html",
  "./golod.html",
  "./index.html",
  "./inventar.html",
  "./js/cycle.js?v=20261027a",
  "./js/feeds.js?v=20261027r",
  "./js/food-db.js?v=20261027b",
  "./js/food.js?v=20261028a",
  "./js/gadzhety.js?v=20261026h",
  "./js/gestures.js?v=20261027q",
  "./js/golod.js?v=20261026e",
  "./js/gym.js?v=20261026c",
  "./js/korzina.js?v=20261026e",
  "./js/myzal.js?v=1",
  "./js/nav.js?v=20261027r",
  "./js/progress.js?v=20261027c",
  "./js/pwa.js?v=3",
  "./js/recepty.js?v=20261027a",
  "./js/sections.js?v=1",
  "./js/tehnika.js?v=2",
  "./js/trener.js?v=20261026i",
  "./js/vozvrat.js?v=20261027c",
  "./kalorii.html",
  "./korzina.html",
  "./manifest.webmanifest",
  "./moy-zal.html",
  "./nauka.html",
  "./novosti.html",
  "./odezhda.html",
  "./offline.html",
  "./pitanie.html",
  "./progress.html",
  "./recepty.html",
  "./servisy.html",
  "./testy.html",
  "./trener.html",
  "./vopros.html",
  "./vozvrat.html",
  "./zal.html"
];
const MEDIA = [
  "./apple-touch-icon.png",
  "./favicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./img/01_pereryv.jpg",
  "./img/02_zapas.jpg",
  "./img/04_zhenshchiny.jpg",
  "./img/blizost/cover.webp",
  "./img/blizost/most.webp",
  "./img/brand/avatar-dark.png",
  "./img/brand/avatar-light.png",
  "./img/brand/logo-dark-bg.png",
  "./img/brand/logo-light-bg.png",
  "./img/brand/logo-light.svg",
  "./img/brand/logo-original.svg",
  "./img/brand/mark-light.svg",
  "./img/brand/mark-original.svg",
  "./img/brand/wordmark-light.svg",
  "./img/hero_squat.jpg",
  "./img/hero_squat.jpg?v=2",
  "./img/inventar/gadzhety.webp",
  "./img/inventar/nabor.webp",
  "./img/odezhda/byust.webp",
  "./img/odezhda/komplekt.webp",
  "./img/odezhda/obuv.webp",
  "./img/odezhda/stirka.webp",
  "./img/og.jpg",
  "./img/pitanie/belok.webp",
  "./img/pitanie/hands.webp",
  "./img/pitanie/kletchatka.webp",
  "./img/pitanie/korzina.webp",
  "./img/pitanie/mikro.webp",
  "./img/pitanie/perekusy.webp",
  "./img/pitanie/sladkoe.webp",
  "./img/pitanie/trenirovka.webp",
  "./img/pitanie/uglevody.webp",
  "./img/pitanie/voda.webp",
  "./img/pitanie/zhiry.webp",
  "./img/portrait.jpg",
  "./img/portrait.jpg?v=3",
  "./img/recepty/kurica.webp",
  "./img/recepty/omlet.webp",
  "./img/recepty/ovsyanka.webp",
  "./img/recepty/salat.webp",
  "./img/recepty/treska.webp",
  "./img/recepty/tvorog.webp",
  "./img/tehnika/goblet.webp",
  "./img/tehnika/koshka.webp",
  "./img/tehnika/most.webp",
  "./img/tehnika/noski.webp",
  "./img/tehnika/otzhimaniya.webp",
  "./img/tehnika/planka.webp",
  "./img/tehnika/prised.webp",
  "./img/tehnika/rumynskaya.webp",
  "./img/tehnika/superman.webp",
  "./img/tehnika/tyaga-ganteli.webp",
  "./img/tehnika/verhniy-blok.webp",
  "./img/tehnika/vypady.webp",
  "./img/tehnika/zhim-skamya.webp",
  "./img/tehnika/zhim-stoya.webp",
  "./img/tehnika/zhuk.webp",
  "./img/trener-thumb.jpg",
  "./img/trener-thumb.jpg?v=2"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Если обязательный файл не загрузился, прежняя рабочая версия остаётся активной.
    await cache.addAll(CORE);
    await Promise.allSettled(MEDIA.map(u => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('alenafit-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
        if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {})); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: isPage }).then(r => r || (isPage ? caches.match('./offline.html') : Response.error())))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {})); }
        return res;
      }).catch(() => cached || Response.error());
      e.waitUntil(net.then(() => {}).catch(() => {}));
      return cached || net;
    })
  );
});
