/**
 * EDUkenZA Paystack Payment Gateway Integration Service
 * Exclusively integrated with Paystack for school fees, SaaS billing, and digital student wallets.
 * Zero client authority: All verifications, amounts, and ledger settlements are server-authoritative.
 */

export interface PaystackConfigResponse {
  success: boolean;
  provider: 'Paystack';
  configured: boolean;
  publicKey: string | null;
  mode: 'live' | 'test' | 'unconfigured';
  currency: string;
  supportedChannels: string[];
  message: string;
}

export interface PaystackInitializeRequest {
  walletId?: string;
  invoiceId?: string;
  invoiceType?: 'student_invoice' | 'billing_invoice' | 'wallet_topup' | 'daily_service';
  schoolId: string;
  studentId?: string;
  studentName?: string;
  payerEmail: string;
  payerName?: string;
  payerUid?: string;
  amount?: number;
  currency?: string;
  feeType?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitializeResponse {
  success: boolean;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  publicKey?: string;
  amount: number;
  currency: string;
  message?: string;
  error?: string;
}

export interface PaystackVerifyResponse {
  success: boolean;
  status: 'successful' | 'failed' | 'pending' | 'abandoned';
  alreadyProcessed?: boolean;
  receiptNumber?: string;
  reference: string;
  amount: number;
  currency: string;
  message: string;
  error?: string;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        access_code?: string;
        channels?: string[];
        metadata?: any;
        callback?: (response: { reference: string; status?: string }) => void;
        onClose?: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Dynamically loads the Paystack Inline JavaScript popup library if not already present.
 */
export async function loadPaystackInlineScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.PaystackPop) return true;

  return new Promise((resolve) => {
    const existingScript = document.getElementById('paystack-inline-js');
    if (existingScript) {
      if (window.PaystackPop) return resolve(true);
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      console.log('[Paystack SDK] Inline JS loaded successfully.');
      resolve(true);
    };
    script.onerror = (err) => {
      console.error('[Paystack SDK] Failed to load inline JS:', err);
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Checks server-side Paystack readiness and public key configuration.
 */
export async function fetchPaystackConfig(): Promise<PaystackConfigResponse> {
  try {
    const res = await fetch('/api/payments/paystack/config');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data: PaystackConfigResponse = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Paystack Service] Error fetching config:', err);
    return {
      success: false,
      provider: 'Paystack',
      configured: false,
      publicKey: null,
      mode: 'unconfigured',
      currency: 'GHS',
      supportedChannels: ['mobile_money', 'card'],
      message: 'Failed to connect to backend Paystack configuration endpoint.'
    };
  }
}

/**
 * Initializes a secure Paystack transaction via the server.
 */
export async function initializePaystackPayment(
  req: PaystackInitializeRequest
): Promise<PaystackInitializeResponse> {
  const res = await fetch('/api/payments/paystack/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to initialize Paystack payment session.');
  }

  return data as PaystackInitializeResponse;
}

/**
 * Calls the backend to authoritatively verify payment with Paystack API.
 * This ensures the database is updated atomically.
 */
export async function verifyPaystackPayment(
  reference: string
): Promise<PaystackVerifyResponse> {
  const res = await fetch('/api/payments/paystack/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reference })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Payment verification failed on server.');
  }

  return data as PaystackVerifyResponse;
}

/**
 * High-level helper: Initiates Paystack checkout flow, opens modal / redirect,
 * and waits for backend verification to return the authentic receipt.
 */
export async function startPaystackCheckout(
  request: PaystackInitializeRequest,
  onModalClose?: () => void
): Promise<PaystackVerifyResponse> {
  // 1. Initialize on backend
  const initResult = await initializePaystackPayment(request);
  const { reference, accessCode, authorizationUrl, publicKey } = initResult;

  // 2. Try loading Paystack Inline popup
  const isScriptLoaded = await loadPaystackInlineScript();

  if (isScriptLoaded && window.PaystackPop && publicKey) {
    return new Promise((resolve, reject) => {
      try {
        const handler = window.PaystackPop!.setup({
          key: publicKey,
          email: request.payerEmail,
          amount: Math.round((initResult.amount || 0) * 100),
          currency: initResult.currency || 'GHS',
          ref: reference,
          access_code: accessCode,
          channels: ['card', 'mobile_money', 'bank_transfer', 'qr'],
          callback: async (response) => {
            console.log('[Paystack Checkout Completed]', response);
            try {
              // Authoritatively verify on backend
              const verifyResult = await verifyPaystackPayment(response.reference || reference);
              resolve(verifyResult);
            } catch (vErr) {
              reject(vErr);
            }
          },
          onClose: () => {
            console.log('[Paystack Modal Closed by User]');
            if (onModalClose) onModalClose();
            reject(new Error('Payment window closed before completing transaction.'));
          }
        });

        handler.openIframe();
      } catch (sdkErr: any) {
        console.warn('[Paystack Popup Error, falling back to redirect]', sdkErr);
        if (authorizationUrl) {
          window.location.href = authorizationUrl;
        } else {
          reject(sdkErr);
        }
      }
    });
  } else if (authorizationUrl) {
    // Redirect flow fallback
    window.location.href = authorizationUrl;
    return new Promise(() => {}); // Execution continues on redirect
  } else {
    throw new Error('Unable to launch Paystack checkout. Please verify network connection.');
  }
}
