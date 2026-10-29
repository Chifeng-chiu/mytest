/* 樂活在地通 PWA Service Worker */
const VERSION = 'v1.1.1';
const CACHE_NAME = `lohas-${VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;800;900&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 核心檔案必須全部快取，確保離線也能開啟。
    await cache.addAll(APP_SHELL);

    // CDN 資源若暫時抓不到，不應讓整個安裝失敗。
    await Promise.allSettled(EXTERNAL_ASSETS.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { mode: 'no-cors', cache: 'reload' }));
        if (response) await cache.put(url, response.clone());
      } catch (error) {
        // 離線安裝時略過，之後上線會由 fetch 事件補齊。
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('lohas-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    if (response && response.ok) {
      // 固定用 index.html 當作離線殼層，查詢字串不另外佔快取。
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (error) {
    clearTimeout(timeout);
    return (await cache.match('./index.html'))
      || (await cache.match('./'))
      || Response.error();
  }
}

async function handleSameOrigin(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

async function handleCrossOrigin(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleSameOrigin(request));
    return;
  }

  event.respondWith(handleCrossOrigin(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
