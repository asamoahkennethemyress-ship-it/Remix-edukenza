/**
 * EDUkenZA API & Backend Routing Configuration
 * Provides intelligent routing for Gemini AI, Paystack, and core school endpoints:
 * - Web / PWA / Cloud Run: Routes directly to the authoritative full-stack server endpoints (/api/*).
 * - Native Mobile Containers (Capacitor/Cordova): Routes to the production backend URL when native protocols (capacitor://, file://) are detected.
 */

export const VERCEL_PRODUCTION_BACKEND_URL = 'https://remixedukenza-h22c8g4v8-edu-ken-za.vercel.app';

/**
 * Detect if the app is currently running inside a Capacitor native app or native WebView container
 * (where there is no local Express backend on the same origin).
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return (
    !!w.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    window.location.protocol === 'file:'
  );
};

/**
 * Check if running in PWA standalone display mode
 */
export const isPwaStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any)?.standalone === true
  );
};

/**
 * Resolves an API path to the proper authoritative URL:
 * - On native mobile containers: uses the remote production backend.
 * - On web, PWA, and Cloud Run: uses standard relative /api/* to communicate with the local full-stack server.
 */
export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Only route to external host if running inside a native mobile container without local server
  if (isCapacitorNative()) {
    return `${VERCEL_PRODUCTION_BACKEND_URL}${cleanPath}`;
  }

  // Web, PWA standalone, and Cloud Run containers communicate with their own server
  return cleanPath;
}

/**
 * Initializes transparent fetch proxy for mobile native containers.
 * In web and PWA modes, requests naturally route to the full-stack server.
 */
let proxyInitialized = false;

export function initializeMobileApiProxy(): void {
  if (typeof window === 'undefined' || proxyInitialized) return;
  proxyInitialized = true;

  // In web browsers and standard PWA preview, the full-stack server is on the same origin
  if (!isCapacitorNative()) {
    console.log('[API Routing] Standard full-stack web/PWA mode active -> using local server /api endpoints');
    return;
  }

  try {
    const originalFetch = window.fetch?.bind(window);
    if (!originalFetch) return;

    const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        let rawUrl = '';
        if (typeof input === 'string') {
          rawUrl = input;
        } else if (input instanceof URL) {
          rawUrl = input.toString();
        } else if (input && typeof (input as Request).url === 'string') {
          rawUrl = (input as Request).url;
        }

        if (rawUrl.startsWith('/api') || rawUrl.startsWith('api/')) {
          const formattedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          const targetUrl = `${VERCEL_PRODUCTION_BACKEND_URL}${formattedPath}`;

          let response: Response;
          if (typeof input === 'string') {
            response = await originalFetch(targetUrl, init);
          } else if (input instanceof URL) {
            response = await originalFetch(new URL(targetUrl), init);
          } else {
            response = await originalFetch(new Request(targetUrl, input), init);
          }

          // If remote Vercel server returns 401 Protected Deployment, fall back gracefully
          if (response.status === 401) {
            console.warn('[API Proxy] Remote backend returned 401 (Deployment Protection). Falling back to relative endpoint.');
            return await originalFetch(input, init);
          }

          return response;
        }

        return await originalFetch(input, init);
      } catch (err) {
        // Fall back to original fetch on network or proxy exception
        return originalFetch(input, init);
      }
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: patchedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        (window as any).fetch = patchedFetch;
      } catch (assignErr) {
        console.warn('[API Proxy] Unable to override window.fetch directly:', assignErr);
      }
    }

    console.log('[API Routing] Capacitor native proxy active -> routing to', VERCEL_PRODUCTION_BACKEND_URL);
  } catch (proxyErr) {
    console.warn('[API Proxy] Setup notice:', proxyErr);
  }
}

export const initializePwaApiRouting = initializeMobileApiProxy;
