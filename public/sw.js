// EDUkenZA Progressive Web App Service Worker
const CACHE_NAME = 'edukenza-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
];

// 1. Service Worker Install Event - Pre-cache essential frontend assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core PWA assets for offline access');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activate Event - Clean up stale caches and take control
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

// 3. Service Worker Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or special schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Handle SPA navigation requests: Network-First falling back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Handle API and dynamic service requests: Network-First with offline catch
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('vercel.app') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('paystack.co')
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Fallback silently if offline and resource is not cached
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync for offline sync triggers
self.addEventListener('sync', (event) => {
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
