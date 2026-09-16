/**
 * EDUkenZA API & Backend Routing Configuration
 * Ensures Express, Gemini AI, and Paystack endpoints cleanly route to the Vercel production backend URL:
 * https://remixedukenza-h22c8g4v8-edu-ken-za.vercel.app
 * across PWA standalone, mobile native WebViews (Capacitor/PWABuilder), and web clients.
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
 * Check if the app is currently running in standalone PWA mode
 */
export const isPwaStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any)?.standalone === true
  );
};

/**
 * Determines whether a given path or URL targets Gemini AI or Paystack services
 */
export const isGeminiOrPaystackEndpoint = (rawPath: string): boolean => {
  if (!rawPath) return false;
  const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const pathWithoutQuery = cleanPath.split('?')[0].split('#')[0].toLowerCase();

  return (
    pathWithoutQuery.startsWith('/api/ai') ||
    pathWithoutQuery.startsWith('/api/gemini') ||
    pathWithoutQuery.startsWith('/api/payments/paystack') ||
    pathWithoutQuery.startsWith('/api/payments') ||
    pathWithoutQuery.startsWith('/api/paystack')
  );
};

/**
 * Resolves an API path to the proper authoritative production Vercel URL
 */
export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Always route Gemini and Paystack API calls to the live production server
  if (isGeminiOrPaystackEndpoint(cleanPath)) {
    return `${VERCEL_PRODUCTION_BACKEND_URL}${cleanPath}`;
  }

  // Also route all other relative /api calls if running on native mobile or standalone PWA
  if (isCapacitorNative() || isPwaStandalone()) {
    return `${VERCEL_PRODUCTION_BACKEND_URL}${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Global transparent fetch interceptor.
 * Ensures that all API fetch calls targeting Gemini and Paystack anywhere in the application
 * (as well as mobile/PWA API calls) cleanly route to the Vercel production backend URL:
 * https://remixedukenza-h22c8g4v8-edu-ken-za.vercel.app
 */
let proxyInitialized = false;

export function initializeMobileApiProxy(): void {
  if (typeof window === 'undefined' || proxyInitialized) return;
  proxyInitialized = true;

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

        // Parse relative path or pathname
        let shouldReroute = false;
        let finalUrl = rawUrl;

        // If it starts with relative /api or api/
        if (rawUrl.startsWith('/api') || rawUrl.startsWith('api/')) {
          const formattedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          if (isGeminiOrPaystackEndpoint(formattedPath) || isCapacitorNative() || isPwaStandalone()) {
            shouldReroute = true;
            finalUrl = `${VERCEL_PRODUCTION_BACKEND_URL}${formattedPath}`;
          }
        } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          try {
            const parsed = new URL(rawUrl);
            // If calling local dev origin or custom origin for Gemini/Paystack
            if (isGeminiOrPaystackEndpoint(parsed.pathname)) {
              if (!parsed.hostname.includes('vercel.app')) {
                shouldReroute = true;
                finalUrl = `${VERCEL_PRODUCTION_BACKEND_URL}${parsed.pathname}${parsed.search}`;
              }
            }
          } catch {
            // Ignore URL parse error
          }
        }

        if (shouldReroute) {
          if (typeof input === 'string') {
            input = finalUrl;
          } else if (input instanceof URL) {
            input = new URL(finalUrl);
          } else {
            input = new Request(finalUrl, input);
          }
        }

        return await originalFetch(input, init);
      } catch {
        return originalFetch(input, init);
      }
    };

    // Safely attempt overriding window.fetch without throwing
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

    console.log('[API Proxy] EDUkenZA Production Backend Proxy active ->', VERCEL_PRODUCTION_BACKEND_URL);
  } catch (proxyErr) {
    console.warn('[API Proxy] Setup notice:', proxyErr);
  }
}

// Named alias for clarity
export const initializePwaApiRouting = initializeMobileApiProxy;
