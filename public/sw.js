/* global clients */

const CACHE_VERSION = 'irz-shell-v3'
const OFFLINE_URL = '/offline.html'
const SHELL_ASSETS = [
  OFFLINE_URL,
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/badge-96.png',
  '/icons/notification-192.png',
]

const BYPASS_PATH_PREFIXES = [
  '/api/',
  '/admin',
  '/sign-in',
  '/sign-up',
  '/_next/',
  '/ingest/',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (BYPASS_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    )
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'IT Resource Zone', body: event.data.text() }
  }

  const title = payload.title || 'IT Resource Zone'
  const options = {
    body: payload.body || 'You have a new app notification.',
    icon: payload.icon || '/icons/notification-192.png',
    badge: payload.badge || '/icons/badge-96.png',
    tag: payload.tag || 'irz-notification',
    renotify: false,
    data: {
      url: payload.url || '/tasks',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/tasks', self.location.origin).toString()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus()
      }
      return clients.openWindow(targetUrl)
    }),
  )
})
