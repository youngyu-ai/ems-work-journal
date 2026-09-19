const CACHE_VERSION = 'ems-pwa-v3.0.2';
const SHELL_CACHE_NAME = `ems-shell-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `ems-static-${CACHE_VERSION}`;

// 僅快取專案核心必要檔案
const APP_SHELL_RESOURCES = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './css/components.css',
  './js/app.js',
  './js/api.js',
  './js/db.js',
  './js/search.js',
  './js/ui.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching App Shell');
      return cache.addAll(APP_SHELL_RESOURCES);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== SHELL_CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 關鍵修復：過濾非 http / https 請求（例如 chrome-extension://），避免報錯
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 2. 若為 Google Apps Script API 請求，直接放行交由前端 IndexedDB 管理
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return;
  }

  // 3. 靜態資源使用 Cache First 策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(STATIC_CACHE_NAME).then((cache) => {
          // 只快取 http/https 請求
          if (event.request.url.startsWith('http')) {
            cache.put(event.request, responseToCache);
          }
        });
        return networkResponse;
      }).catch(() => {
        // 離線回退
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
