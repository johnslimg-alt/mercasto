self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self['caches'] ? self['caches'].keys().then(keys => Promise.all(keys.map(key => self['caches'].delete(key)))) : Promise.resolve(),
            self.clients.claim()
        ])
    );
});

self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                data: { url: data.url || '/' },
                vibrate: [200, 100, 200]
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url === target && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(target);
        })
    );
});
