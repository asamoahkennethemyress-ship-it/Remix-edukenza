import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { initializeMobileApiProxy } from './config/api';

// Initialize Mobile Capacitor API routing proxy
initializeMobileApiProxy();

// Safe service worker initialization
try {
  registerServiceWorker();
} catch (swErr) {
  console.warn('[SW Registration Notice]:', swErr);
}

// Global window diagnostic error listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[EDUkenZA Global Window Error]:', event.error || event.message || event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason) {
      console.warn('[EDUkenZA Unhandled Promise Rejection Caught]:', event.reason?.message || event.reason);
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (mountErr: any) {
    console.error('[CRITICAL ROOT MOUNT ERROR]:', mountErr);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#020617;color:#f8fafc;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;">
        <div style="max-width:520px;background:#0f172a;border:1px solid #ef4444;border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);">
          <h2 style="font-size:20px;font-weight:bold;color:#ef4444;margin-bottom:12px;">EDUkenZA Application Startup Error</h2>
          <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">Failed to initialize root React component.</p>
          <pre style="font-size:12px;background:#020617;padding:12px;border-radius:8px;color:#fca5a5;overflow-x:auto;text-align:left;">${mountErr?.message || mountErr}</pre>
        </div>
      </div>
    `;
  }
}


