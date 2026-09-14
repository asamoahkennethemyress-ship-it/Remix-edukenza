const CACHE_NAME = 'edukenza-v1-cache';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
];

// 1. Service Worker Install Event - Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets for offline access');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Service Worker Fetch Event - Cache-First for static assets, Network-First for API calls
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests or browser extension/chrome-extension requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Handle Firebase/API requests: Network-First with catch
  if (requestUrl.hostname.includes('firestore.googleapis.com') || 
      requestUrl.hostname.includes('identitytoolkit') ||
      requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Fetch failed, serving offline cache if available:', err);
      });

      // Return cached response immediately if available, or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync Event Listener
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered for tag:', event.tag);
  if (
    event.tag === 'sync-edukenza-offline' || 
    event.tag === 'sync-cbt-answers' || 
    event.tag === 'sync-wallet-txns'
  ) {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'FLUSH_OFFLINE_QUEUE',
            tag: event.tag,
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});

