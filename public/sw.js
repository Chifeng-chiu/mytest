/* 樂活在地通 PWA Service Worker（前後端分離版） */
const VERSION = 'v2.0.2';
const CACHE_NAME = `lohas-${VERSION}`;
const APP_SHELL = [
  './',
  './elder.html',
  './admin.html',
  './manifest.json',
  './css/styles.css',
  './js/api.js',
  './js/elder.js',
  './js/admin.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;800;900&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
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
  const url = new URL(request.url);
  const fallback = url.pathname.endsWith('/admin.html')
    ? './admin.html'
    : './elder.html';

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    clearTimeout(timeout);
    return (await cache.match(request))
      || (await cache.match(fallback))
      || (await cache.match('./elder.html'))
      || Response.error();
  }
}

async function handleSameOrigin(request) {
  const url = new URL(request.url);
  // API 與 SSE 一律走網路；離線資料由 public/js/api.js 的 localStorage fallback 處理。
  if (url.pathname.startsWith('/api/')) {
    return fetch(request);
  }

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
