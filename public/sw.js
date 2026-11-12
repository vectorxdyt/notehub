self.addEventListener('push', event => {
  let data = {title: 'New calculus notes', body: 'New notes are ready to review.', url: '/'};
  try { data = {...data, ...event.data.json()}; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'notehub-new-notes',
    data: {url: data.url || '/'},
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) { existing.navigate(destination); return existing.focus(); }
    return clients.openWindow(destination);
  }));
});
