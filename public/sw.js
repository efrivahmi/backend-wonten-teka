self.addEventListener('push', event => {
    const payload = event.data ? event.data.json() : {};
    event.waitUntil(self.registration.showNotification(payload.title || 'Wonten Teka', {
        body: payload.body || 'Ada informasi baru dari perusahaan.',
        icon: payload.icon || '/favicon.png',
        badge: payload.badge || '/favicon.png',
        data: { url: payload.url || '/employee/dashboard' },
    }));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = event.notification.data?.url || '/employee/dashboard';
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
        const existing = windows.find(window => 'focus' in window);
        return existing ? existing.focus() : clients.openWindow(target);
    }));
});
