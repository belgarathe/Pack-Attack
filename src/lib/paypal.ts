/**
 * PayPal Integration for Pack Attack
 * 
 * This module handles all PayPal API interactions including:
 * - Creating orders
 * - Capturing payments
 * - Generating access tokens
 * 
 * Environment Variables Required:
 * - PAYPAL_CLIENT_ID: Your PayPal app client ID
 * - PAYPAL_CLIENT_SECRET: Your PayPal app secret
 * - PAYPAL_MODE: 'sandbox' or 'live'
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// PayPal API base URLs
const PAYPAL_API_BASE = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  payer?: {
    payer_id: string;
    email_address: string;
    name?: {
      given_name: string;
      surname: string;
    };
  };
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

/**
 * Get PayPal access token using client credentials
 */
async function getAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal auth error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data: PayPalAccessToken = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal order for coin purchase
 */
export async function createPayPalOrder(
  amount: number, 
  coins: number,
  description: string = 'Pack Attack Coins'
): Promise<PayPalOrderResponse> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: amount.toFixed(2),
          },
          description: `${coins.toLocaleString()} ${description}`,
          custom_id: JSON.stringify({ coins }),
        },
      ],
      application_context: {
        brand_name: 'Pack Attack',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/purchase-coins?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/purchase-coins?cancelled=true`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal create order error:', error);
    throw new Error('Failed to create PayPal order');
  }

  return response.json();
}

/**
 * Capture a PayPal order after user approval
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResponse> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal capture error:', error);
    throw new Error('Failed to capture PayPal order');
  }

  return response.json();
}

/**
 * Verify a PayPal webhook signature
 */
export async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!response.ok) {
    console.error('PayPal webhook verification failed');
    return false;
  }

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}

/**
 * Get order details from PayPal
 */
export async function getPayPalOrder(orderId: string): Promise<any> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal order');
  }

  return response.json();
}

/**
 * Check if PayPal is properly configured
 */
export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

/**
 * Get PayPal client ID for frontend
 */
export function getPayPalClientId(): string {
  return PAYPAL_CLIENT_ID;
}

/**
 * Get PayPal mode (sandbox/live)
 */
export function getPayPalMode(): string {
  return PAYPAL_MODE;
}







