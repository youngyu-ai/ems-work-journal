const CACHE_NAME = 'ems-pwa-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 安裝時快取靜態資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 攔截網路請求 (Cache First 策略)
self.addEventListener('fetch', event => {
  // 如果是呼叫 GAS API (包含 script.google.com)，則永遠只走網路，不快取
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});