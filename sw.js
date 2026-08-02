const CACHE = 'search-app-v1';
const FILES = [
  '/index.html',
  '/manifest.json',
  '/',
];

// 安装：预缓存核心文件
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES).catch(() => {}))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：缓存优先，网络兜底
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(response => {
        // 只缓存同源的 HTML / CSS / JS
        if (response.ok && new URL(e.request.url).origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
