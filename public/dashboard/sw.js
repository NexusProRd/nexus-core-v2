const CACHE = 'nexus-dashboard-v1'
const CACHE_PREFIX = 'nexus-dashboard-'
const SCOPE = '/dashboard'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SCOPE, '/offline.html']))
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
  console.log('[SW] push received')
  const data = e.data?.json() ?? {}

  e.waitUntil(
    self.registration.showNotification(data.title || 'Nuevo pedido', {
      body: data.body,
      icon: data.icon || '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url: data.url || '/dashboard/pedidos' },
      vibrate: [200, 100, 200],
    }).then(() => console.log('[SW] notification shown'))
  )
})

self.addEventListener('notificationclick', (e) => {
  console.log('[SW] notification click')
  e.notification.close()

  const url = e.notification.data?.url || '/dashboard/pedidos'

  e.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        console.log('[SW] existing client found, focusing')
        await client.focus()
        console.log('[SW] navigate pedidos')
        await client.navigate(url)
        return
      }
    }
    console.log('[SW] opening new window')
    await clients.openWindow(self.location.origin + url)
  })().catch((error) => console.error('[SW] notification click error', error)))
})
