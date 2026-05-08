const CACHE_NAME = 'keeptrack-shell-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']

const extractAssetUrls = (html) => {
  const matches = html.matchAll(/(?:src|href)=["']([^"']+)["']/g)
  const urls = new Set()

  for (const match of matches) {
    const rawUrl = match[1]
    if (!rawUrl || rawUrl.startsWith('data:')) {
      continue
    }

    const absoluteUrl = new URL(rawUrl, self.location.origin)
    if (absoluteUrl.origin !== self.location.origin) {
      continue
    }

    urls.add(`${absoluteUrl.pathname}${absoluteUrl.search}`)
  }

  return Array.from(urls)
}

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const indexResponse = await fetch('/index.html', { cache: 'no-cache' })
  if (!indexResponse.ok) {
    return
  }

  await cache.put('/index.html', indexResponse.clone())

  const html = await indexResponse.text()
  const assets = extractAssetUrls(html)

  if (assets.length > 0) {
    await cache.addAll(assets)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          await cache.put('/index.html', response.clone())
          return response
        } catch {
          const cached = await caches.match('/index.html')
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) {
        return cached
      }

      try {
        const response = await fetch(request)
        if (response.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      } catch {
        return Response.error()
      }
    })(),
  )
})
