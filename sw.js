/* ALENAFIT — работа как приложение и без интернета.
   Страницы: сначала сеть (чтобы обновления приходили сразу), без сети — сохранённая копия,
   а если копии нет — страница «Нет интернета». Данные журналов (localStorage) кеш не затрагивает.
   Стили, скрипты, картинки: сначала из кэша, в фоне обновляются. */
const VERSION = 'alenafit-release-20261029-v29';
// CSS/JS адреса совпадают с подключениями страниц, включая версию кэша.
const CORE = [
  "./img/alena-invitation.webp",
  "./",
  "./404.html",
  "./blizost.html",
  "./data/products-ru.json",
  "./fonts/golos-pdf.ttf",
  "./fonts/golos-text-cyrillic.woff2",
  "./fonts/golos-text-latin.woff2",
  "./fonts/unbounded-cyrillic.woff2",
  "./fonts/unbounded-latin.woff2",
  "./gadzhety.html",
  "./golod.html",
  "./index.html",
  "./inventar.html",
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
  "./zal.html",
  "./css/brand-pilot.css?v=1",
  "./css/card-reveal.css?v=3",
  "./css/design-pilot.css?v=20261029a",
  "./css/editorial-refine.css?v=1",
  "./css/final-invite.css?v=20261028d",
  "./css/fonts.css?v=20261028b",
  "./css/gym-images.css?v=20261028j",
  "./css/home-motion.css?v=20261028b",
  "./css/site.css?v=20261029m",
  "./js/brand-pilot.js?v=1",
  "./js/card-reveal.js?v=3",
  "./js/cycle-diary.js?v=20261028d",
  "./js/cycle.js?v=20261028b",
  "./js/design-pilot.js?v=20261029a",
  "./js/editorial-refine.js?v=1",
  "./js/export.js?v=20261028d",
  "./js/feeds.js?v=20261027r",
  "./js/food-db.js?v=20261027b",
  "./js/food.js?v=20261029fallback",
  "./js/gadzhety.js?v=20261026h",
  "./js/gestures.js?v=20261027q",
  "./js/golod.js?v=20261026e",
  "./js/gym.js?v=20261028j",
  "./js/korzina.js?v=20261026e",
  "./js/myzal.js?v=20261028b",
  "./js/nav.js?v=20261028f",
  "./js/perek-search.js?v=20261029fallback",
  "./js/progress.js?v=20261028d",
  "./js/pwa.js?v=20261028b",
  "./js/recepty.js?v=20261027a",
  "./js/sections.js?v=1",
  "./js/tehnika.js?v=20261028b",
  "./js/trener.js?v=20261026i",
  "./js/vozvrat.js?v=20261027c"
];
const MEDIA = [
  "./img/gym/treadmill.webp?v=4",
  "./img/gym/bike.webp?v=4",
  "./img/gym/elliptical.webp?v=4",
  "./img/gym/rack.webp?v=4",
  "./img/gym/smith.webp?v=4",
  "./img/gym/bench.webp?v=4",
  "./img/gym/dumbbells.webp?v=4",
  "./img/gym/hyperextension.webp?v=4",
  "./img/gym/lat-pulldown.webp?v=4",
  "./img/gym/cable-row.webp?v=4",
  "./img/gym/crossover.webp?v=4",
  "./img/gym/leg-press.webp?v=4",
  "./img/gym/leg-extension.webp?v=4",
  "./img/gym/leg-curl.webp?v=4",
  "./img/gym/hip-abduction.webp?v=4",
  "./img/gym/mats.webp?v=4",

  "./fonts/unbounded-vietnamese.woff2",
  "./fonts/golos-text-cyrillic-ext.woff2",
  "./fonts/unbounded-cyrillic-ext.woff2",
  "./fonts/golos-text-latin-ext.woff2",
  "./fonts/unbounded-latin-ext.woff2",
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
  "./img/brand/logo-light.svg",
  "./img/brand/mark-light.svg",
  "./img/brand/wordmark-light.svg",
  "./img/hero_squat.jpg?v=2",
  "./img/inventar/gadzhety.webp",
  "./img/inventar/nabor.webp",
  "./img/odezhda/byust.webp",
  "./img/odezhda/komplekt.webp",
  "./img/odezhda/obuv.webp",
  "./img/odezhda/stirka.webp",
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
  "./img/trener-thumb.jpg?v=2"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Если обязательный файл не загрузился, прежняя рабочая версия остаётся активной.
    await cache.addAll(CORE);
    // Медиа сохраняются отдельно после загрузки интерфейса: шрифты и инструменты уже в CORE.
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
  if(url.pathname==='/api/foods')return;
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

// Пакет медиа запускается приложением в свободное время, максимум 3 запроса одновременно.
let warming = null;
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'CACHE_MEDIA') return;
  if (!warming) warming = (async () => {
    const cache = await caches.open(VERSION);
    let next = 0;
    async function worker() {
      while (next < MEDIA.length) {
        const url = MEDIA[next++];
        try { if (!await cache.match(url)) await cache.add(url); } catch (ignore) {}
      }
    }
    await Promise.all([worker(), worker(), worker()]);
  })().finally(() => { warming = null; });
  e.waitUntil(warming);
});
