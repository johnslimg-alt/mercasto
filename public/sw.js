// Чистый Service Worker 2026 (Без кэширования, только для Web Push)

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Мгновенная активация
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192x192.png',
                data: data.url || '/'
            })
        );
    }
});