/**
 * EDUkenZA Mobile & Hybrid API Routing Configuration
 * Ensures Express, Gemini AI, and Paystack endpoints cleanly route to the Vercel backend URL
 * when running inside Capacitor iOS/Android native WebViews.
 */

export const VERCEL_PRODUCTION_BACKEND_URL = 'https://remixedukenza-h22c8g4v8-edu-ken-za.vercel.app';

/**
 * Detect if the app is currently running inside a Capacitor native app or native WebView container
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
 * Resolves an API path to the proper full URL depending on environment
 */
export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isCapacitorNative()) {
    return `${VERCEL_PRODUCTION_BACKEND_URL}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Initializes a transparent fetch proxy so that all relative `/api/...` calls made
 * anywhere in the app automatically redirect to the Vercel production backend when
 * running in mobile native WebViews, avoiding 404 or connection failures.
 */
let proxyInitialized = false;

export function initializeMobileApiProxy(): void {
  if (typeof window === 'undefined' || proxyInitialized) return;
  proxyInitialized = true;

  // Only apply proxy when running in a native mobile container
  if (!isCapacitorNative()) {
    return;
  }

  try {
    const originalFetch = window.fetch?.bind(window);
    if (!originalFetch) return;

    const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        let url: string = '';
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else if (input && typeof (input as Request).url === 'string') {
          url = (input as Request).url;
        }

        // Check if this is an API call that needs resolution
        if (url.startsWith('/api/') || url.startsWith('/api')) {
          const targetUrl = `${VERCEL_PRODUCTION_BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
          if (typeof input === 'string') {
            input = targetUrl;
          } else if (input instanceof URL) {
            input = new URL(targetUrl);
          } else {
            input = new Request(targetUrl, input);
          }
        }

        return await originalFetch(input, init);
      } catch {
        return originalFetch(input, init);
      }
    };

    // Safely attempt overriding window.fetch without throwing if fetch is a getter-only property
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
        console.warn('[Mobile API Proxy] Unable to override window.fetch directly:', assignErr);
      }
    }
  } catch (proxyErr) {
    console.warn('[Mobile API Proxy] Setup notice:', proxyErr);
  }
}
