// Keeps Campus usable without a connection: the site's own files and the last cafeteria menu images.
// The file keeps its old name so browsers that registered it before update it in place.
const MENU_CACHE = 'campus-menu-images-v1';
const APP_CACHE = 'campus-app-v1';
const MAX_IMAGES = 10;
const EXTRA_FILES = ['manifest.webmanifest', 'campus-icon-192.png', 'campus-icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try { await refreshApp(); } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('campus-app-') && key !== APP_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

function isExternalImage(request) {
  const url = new URL(request.url);
  return request.destination === 'image' && url.protocol === 'https:' && url.origin !== self.location.origin;
}

function isUsable(response) {
  return response.ok && response.type === 'basic' && !response.redirected;
}

// Files the page links to (styles, scripts, icons). After a deploy their ?v= changes, so this list
// is also what decides which older copies can be thrown away.
function linkedFiles(html) {
  const files = new Set(EXTRA_FILES);
  for (const match of html.matchAll(/\s(?:href|src)="([^"#:]+)"/g)) {
    if (!/\.html$/.test(match[1].split('?')[0])) files.add(match[1]);
  }
  return [...files].map(path => new URL(path, self.registration.scope).href);
}

// Saves the start page and every file it needs, then removes files an older deploy used.
async function refreshApp(page) {
  const cache = await caches.open(APP_CACHE);
  const start = new URL('./', self.registration.scope).href;
  if (!page) {
    const response = await fetch(start, { cache: 'no-cache' });
    if (!isUsable(response)) return;
    page = response;
  }
  const html = await page.clone().text();
  const needed = linkedFiles(html);
  await Promise.all(needed.map(async url => {
    if (url.includes('?v=') && await cache.match(url)) return;
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (isUsable(response)) await cache.put(url, response);
    } catch {}
  }));
  await cache.put(start, page);
  const keep = new Set(needed);
  for (const request of await cache.keys()) {
    if (request.url.includes('?v=') && !keep.has(request.url)) await cache.delete(request);
  }
}

// Pages always try the network first so an online visit gets the newest Campus.
async function openPage(event) {
  const url = new URL(event.request.url);
  const start = new URL('./', self.registration.scope).href;
  const isStart = url.href.split(/[?#]/)[0] === start || url.pathname.endsWith('/index.html');
  try {
    const response = await fetch(event.request);
    if (isUsable(response)) {
      if (isStart) event.waitUntil(refreshApp(response.clone()).catch(() => {}));
      else event.waitUntil(caches.open(APP_CACHE).then(cache => cache.put(url.href.split(/[?#]/)[0], response.clone())).catch(() => {}));
    }
    return response;
  } catch (error) {
    // Cloudflare serves privacy.html as /privacy, so either spelling finds a saved page.
    const cache = await caches.open(APP_CACHE), path = `${url.origin}${url.pathname}`;
    return await cache.match(path) || await cache.match(path.replace(/\.html$/, '')) || await cache.match(`${path}.html`) || await cache.match(start) || Response.error();
  }
}

// Versioned files never change, so a saved copy is used as is. Others still prefer the network.
async function openFile(request) {
  const cache = await caches.open(APP_CACHE);
  if (new URL(request.url).searchParams.has('v')) {
    const saved = await cache.match(request);
    if (saved) return saved;
  }
  try {
    const response = await fetch(request);
    if (isUsable(response)) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    return await cache.match(request, { ignoreSearch: true }) || Response.error();
  }
}

async function remember(request, response) {
  const cache = await caches.open(MENU_CACHE);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  while (keys.length > MAX_IMAGES) await cache.delete(keys.shift());
}

async function openMenuImage(request) {
  try {
    const response = await fetch(request);
    if (response.type === 'opaque' || response.ok) {
      try { await remember(request, response); } catch {}
    }
    return response;
  } catch (error) {
    const cache = await caches.open(MENU_CACHE);
    return await cache.match(request) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (isExternalImage(request)) return event.respondWith(openMenuImage(request));
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') return event.respondWith(openPage(event));
  event.respondWith(openFile(request));
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
