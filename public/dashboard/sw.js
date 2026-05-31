const CACHE = 'nexus-dashboard-v1'
const CACHE_PREFIX = 'nexus-dashboard-'
const SCOPE = '/dashboard'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SCOPE, '/offline']))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.pathname === SCOPE) {
    url.pathname = SCOPE + '/'
  }

  if (req.mode === 'navigate') {
    if (!url.pathname.startsWith(SCOPE + '/') && url.pathname !== SCOPE) {
      return
    }
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match(SCOPE)))
    )
    return
  }

  if (url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(req, copy))
        return res
      }))
    )
    return
  }

  e.respondWith(fetch(req))
})

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}

  self.registration.showNotification(data.title || 'Nuevo pedido', {
    body: data.body,
    icon: data.icon || '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    data: { url: data.url || '/dashboard/pedidos' },
    vibrate: [200, 100, 200],
  })
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const url = e.notification.data?.url || '/dashboard/pedidos'

  clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        client.focus()
        client.navigate(url)
        return
      }
    }
    clients.openWindow(self.location.origin + url)
  })
})
