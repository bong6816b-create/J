// 제이건설 SaaS - Service Worker (PWA 오프라인 지원)
const CACHE_NAME = 'jecon-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith('http')) return

  // API / Supabase: network only
  if (event.request.url.includes('supabase.co') || event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline fallback: try cache, then offline page
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          if (event.request.destination === 'document') {
            return caches.match('/offline')
          }
        })
      })
  )
})

// Push Notifications (for visa/safety alerts)
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? '제이건설 알림', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'jecon-notification',
      data: { url: data.url ?? '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
