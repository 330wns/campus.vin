const MENU_CACHE = 'campus-menu-images-v1';
const MAX_IMAGES = 10;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

function isExternalImage(request) {
  const url = new URL(request.url);
  return request.destination === 'image' && url.protocol === 'https:' && url.origin !== self.location.origin;
}

async function remember(request, response) {
  const cache = await caches.open(MENU_CACHE);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  while (keys.length > MAX_IMAGES) await cache.delete(keys.shift());
}

self.addEventListener('fetch', event => {
  if (!isExternalImage(event.request)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.type === 'opaque' || response.ok) {
        try { await remember(event.request, response); } catch {}
      }
      return response;
    } catch (error) {
      const cache = await caches.open(MENU_CACHE);
      return await cache.match(event.request) || Response.error();
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-menu-image') return;
  let url;
  try { url = new URL(event.data.url); } catch { return; }
  if (url.protocol !== 'https:') return;
  event.waitUntil((async () => {
    const request = new Request(url.href, { mode: 'no-cors', credentials: 'omit' });
    try {
      const cache = await caches.open(MENU_CACHE);
      if (await cache.match(request)) return;
      const response = await fetch(request);
      if (response.type === 'opaque' || response.ok) await remember(request, response);
    } catch {}
  })());
});
