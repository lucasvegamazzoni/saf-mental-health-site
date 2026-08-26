/* SAF Check-in service worker — offline app shell.
 *
 * Base-path aware: everything is resolved from `self.registration.scope`, so the
 * same file works at `/` (Firebase Hosting) and `/saf-mental-health-site/`
 * (GitHub Pages mirror). See DEPLOYMENT.md.
 *
 * Strategy
 *   navigations            network-first → cached shell (index.html) when offline
 *   <scope>assets/*        cache-first (hashed, immutable)
 *   same-origin static     stale-while-revalidate (icons, manifest, favicon)
 *   Google Fonts           stale-while-revalidate
 *   Firebase / Google APIs never cached — always network
 */

const VERSION = 'saf-checkin-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const STATIC_CACHE = `${VERSION}-static`;
const KNOWN_CACHES = new Set([SHELL_CACHE, ASSET_CACHE, STATIC_CACHE]);

const SCOPE = new URL(self.registration.scope);
const SHELL_URL = new URL('index.html', SCOPE).href;
const ASSETS_PREFIX = new URL('assets/', SCOPE).pathname;

const NEVER_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'www.googleapis.com',
  'firebaseapp.com',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

/**
 * Cache index.html, then every hashed asset it references. The first page
 * load happens before this worker controls the page, so without this step a
 * first-visit-then-offline reload would have the shell but no JS/CSS.
 */
async function precacheShell() {
  const shell = await caches.open(SHELL_CACHE);
  const response = await fetch(new Request(SHELL_URL, { cache: 'reload' }));
  if (!response.ok) throw new Error(`shell fetch failed: ${response.status}`);
  await shell.put(SHELL_URL, response.clone());

  const html = await response.text();
  const assets = await caches.open(ASSET_CACHE);
  const seen = new Set();
  // index.html → entry js/css; then walk the entry chunk for lazy chunks
  // (route-level `import()` + their CSS), so every route works offline.
  let frontier = extractAssetRefs(html, SHELL_URL);
  for (let depth = 0; depth < 4 && frontier.length; depth += 1) {
    const next = [];
    await Promise.all(
      frontier.map(async (href) => {
        if (seen.has(href)) return;
        seen.add(href);
        try {
          const res = await fetch(href);
          if (!res.ok) return;
          await assets.put(href, res.clone());
          if (href.endsWith('.js')) next.push(...extractAssetRefs(await res.text(), href));
        } catch {
          /* best effort — runtime cache-first picks it up later */
        }
      }),
    );
    frontier = next;
  }
}

/**
 * Same-origin `<scope>assets/*` URLs referenced by the shell HTML or a JS chunk.
 * Vite emits hashed filenames (`Name-abc12345.js|css`); chunk-internal
 * references are relative to `base`, not to the chunk, so resolve from scope.
 */
function extractAssetRefs(text, baseHref) {
  const out = new Set();
  const full = /(?:src|href)=["']([^"']+)["']/g;
  let m;
  while ((m = full.exec(text))) {
    if (!/^[\w./-]+$/.test(m[1])) continue; // skip template-literal fragments in JS
    const u = new URL(m[1], baseHref);
    if (u.origin === SCOPE.origin && u.pathname.startsWith(ASSETS_PREFIX)) out.add(u.href);
  }
  const hashed = /["'`\/]([\w.-]+-[\w-]{8}\.(?:js|css))["'`]/g;
  while ((m = hashed.exec(text))) {
    out.add(new URL(`assets/${m[1]}`, SCOPE).href);
  }
  return [...out];
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KNOWN_CACHES.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Live data and auth: never intercept.
  if (NEVER_CACHE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  if (url.origin === SCOPE.origin) {
    if (url.pathname.startsWith(ASSETS_PREFIX)) {
      event.respondWith(cacheFirst(request, ASSET_CACHE));
      return;
    }
    if (url.pathname.startsWith(SCOPE.pathname)) {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
      return;
    }
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function navigationNetworkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Keep the shell fresh: every successful navigation updates the cached index.
      cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch {
    const shell = await cache.match(SHELL_URL, { ignoreVary: true });
    if (shell) return shell;
    return new Response(offlineFallbackHtml(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (hit) return hit;
  const fresh = await refresh;
  if (fresh) return fresh;
  return new Response('', { status: 504, statusText: 'Offline' });
}

/** Only reached if the shell was never cached (first visit offline). Palette from DESIGN.md. */
function offlineFallbackHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAF Check-in — offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6eee2;color:#2e3a34;font-family:Karla,system-ui,sans-serif;padding:24px}main{max-width:28rem;text-align:center}h1{font-family:Fraunces,Georgia,serif;color:#33463c;font-weight:600;font-size:1.6rem}p{line-height:1.6}a{color:#42604f}</style></head><body><main><h1>You're offline</h1><p>SAF Check-in needs a connection the first time it opens. Once you've visited it, it will keep working without signal.</p><p><a href="./">Try again</a></p></main></body></html>`;
}
