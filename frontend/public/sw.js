const CACHE_NAME = 'vha-static-v1'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', ev => ev.waitUntil(self.clients.claim()))
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return
  ev.respondWith(caches.match(ev.request).then(r => r || fetch(ev.request).then(resp => {
    if (resp && resp.ok) caches.open(CACHE_NAME).then(c => c.put(ev.request, resp.clone()))
    return resp
  })).catch(() => caches.match('/')))
})
