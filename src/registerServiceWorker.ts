import { initOfflineSyncEngine } from './services/offlineSyncService';

/**
 * Registers the EDUkenZA PWA Service Worker (/sw.js)
 * Required for PWA installability and PWABuilder packaging.
 */
export function registerServiceWorker() {
  try {
    // Initialize offline sync engine for queueing background sync
    initOfflineSyncEngine();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const doRegister = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[Service Worker] EDUkenZA PWA Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('[Service Worker] Registration notice:', error);
          });
      };

      if (document.readyState === 'complete') {
        doRegister();
      } else {
        window.addEventListener('load', doRegister);
      }
    }
  } catch (err) {
    console.warn('[Service Worker] Init notice:', err);
  }
}
