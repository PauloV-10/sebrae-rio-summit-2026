/* Service worker: deixa o guia rápido e utilizável mesmo com internet fraca no pavilhão.
   Estratégia: rede primeiro para dados (JSON), cache primeiro para o restante. */
const VERSION = 'srs26-v8';
const CORE = [
  './',
  'index.html',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/gate.js',
  'assets/js/agenda.js',
  'assets/js/mapa.js',
  'assets/js/alimentacao.js',
  'assets/js/contato.js',
  'vendor/qrcode.js',
  'data/agenda.json',
  'data/mapa-osm.json',
  'data/mapa-interior.json',
  'data/alimentacao.json',
  'favicon.svg',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/brand/portes-p.png',
  'assets/brand/portes-logo-full.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (e.request.mode === 'navigate') {
    // casca da página: rede primeiro, para a versão nova chegar já na primeira visita
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((h) => h || caches.match('index.html')))
    );
    return;
  }

  if (url.pathname.endsWith('.json')) {
    // dados: tenta a rede (conteúdo pode ser atualizado durante o evento), cai para o cache
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // estáticos e fotos: cache primeiro, preenchendo em segundo plano
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      });
    })
  );
});
