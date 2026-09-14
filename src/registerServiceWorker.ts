import { initOfflineSyncEngine } from './services/offlineSyncService';

export function registerServiceWorker() {
  try {
    // Initialize offline sync engine for background sync
    initOfflineSyncEngine();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // In development mode, unregister any active service worker to prevent Vite dev server asset interception
      const isDev = Boolean((import.meta as any)?.env?.DEV ?? true);
      if (isDev) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch((err) => {
          console.warn('[Service Worker] Unregister dev notice:', err);
        });
        return;
      }

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[Service Worker] EDUkenZA Offline Engine Registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('[Service Worker] Registration note:', error);
          });
      });
    }
  } catch (err) {
    console.warn('[Service Worker] Registration init note:', err);
  }
}

