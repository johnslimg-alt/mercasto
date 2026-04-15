const CACHE_NAME = 'mercasto-cache-v1';
const urlsToCache = [
  '/'
];

// Установка Service Worker и кэширование важных ресурсов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Перехват запросов (Стратегия: Сначала сеть, затем кэш)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Обработка входящих Web Push уведомлений
self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }
  const data = event.data ? event.data.json() : { title: 'Mercasto', body: 'Tienes una nueva notificación' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});