// Offline support: keeps the site's own files (pages, code chunks, fonts, codecs) that this browser has used.
// It never touches user data: tools don't send requests with it, and only same-origin GETs are cached.
// shortcut: one cache that grows with each deploy's hashed chunks; add versioned cleanup if it ever gets large.
const CACHE = 'kinbench-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/vendor/')) {
    // Content-hashed (or versioned, like /vendor/ffmpeg-core-0.12.10/) and immutable: the cached copy is always right.
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchAndCache(request)));
    return;
  }
  // Pages and the rest: network first so deploys show up at once, cache when offline. An unvisited page
  // falls back to "/" (the language picker); other requests just fail, so Next falls back to a full load.
  event.respondWith(
    fetchAndCache(request).catch(async () => {
      const hit = await caches.match(request, { ignoreSearch: true });
      return hit || (request.mode === 'navigate' && (await caches.match('/'))) || Response.error();
    }),
  );
});

// The page that registered the worker loaded before it was in control; it posts its own URLs to be cached.
self.addEventListener('message', (event) => {
  const urls = Array.isArray(event.data?.cache) ? event.data.cache : [];
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(urls.filter((u) => new URL(u, self.location.origin).origin === self.location.origin).map((u) => cache.add(u).catch(() => {}))),
    ),
  );
});
