import crypto from 'node:crypto';
import type {
  CoinPurchaseResult,
  CreateCoinPurchaseParams,
  CreateWithdrawParams,
  PaymentProviderAdapter,
  WebhookResult,
  WithdrawResult,
} from './types';

type OxaPayInvoiceResponse = {
  data?: { track_id?: string; payment_url?: string };
  error?: { message?: string } | null;
  message?: string;
};

type OxaPayWebhook = {
  type?: string;
  status?: string;
  track_id?: string;
  order_id?: string;
};

const API_URL = 'https://api.oxapay.com/v1/payment/invoice';

function requireKey() {
  const key = process.env.OXAPAY_MERCHANT_API_KEY;
  if (!key) throw new Error('OxaPay is not configured. Set OXAPAY_MERCHANT_API_KEY.');
  return key;
}

function callbackUrl() {
  const value = process.env.OXAPAY_CALLBACK_URL;
  if (!value) throw new Error('OxaPay is not configured. Set OXAPAY_CALLBACK_URL.');
  return value;
}

function verifyHmac(rawBody: string, signature: string | undefined) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', requireKey()).update(rawBody).digest('hex');
  const actual = Buffer.from(signature, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

export const oxapayProvider: PaymentProviderAdapter = {
  name: 'oxapay',

  async createCoinPurchase(params: CreateCoinPurchaseParams): Promise<CoinPurchaseResult> {
    const orderId = params.orderId ?? `${params.userId}-${params.packId}-${Date.now()}`;
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', merchant_api_key: requireKey() },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        lifetime: 60,
        callback_url: callbackUrl(),
        return_url: process.env.OXAPAY_RETURN_URL,
        order_id: orderId,
        email: process.env.OXAPAY_PAYER_EMAIL,
        description: `${params.coins} Valentine Express coins`,
        sandbox: process.env.OXAPAY_SANDBOX === 'true',
      }),
    });
    const data = await response.json() as OxaPayInvoiceResponse;
    const trackId = data.data?.track_id;
    const paymentUrl = data.data?.payment_url;
    if (!response.ok || !trackId || !paymentUrl) {
      throw new Error(data.error?.message || data.message || 'OxaPay invoice creation failed');
    }
    return { orderId, approvalUrl: paymentUrl, providerRef: trackId, status: 'pending' };
  },

  async handlePurchaseWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookResult> {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    if (!verifyHmac(rawBody, headers.hmac)) return { orderId: '', userId: '', coins: 0, ok: false };
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as OxaPayWebhook;
    const paid = String(payload.status ?? '').toLowerCase() === 'paid';
    return {
      orderId: String(payload.order_id ?? ''),
      userId: '',
      coins: 0,
      providerRef: String(payload.track_id ?? ''),
      ok: payload.type === 'invoice' && paid && Boolean(payload.track_id),
    };
  },

  async createWithdraw(_params: CreateWithdrawParams): Promise<WithdrawResult> {
    throw new Error('OxaPay withdrawals are not enabled for this app; use PayPal for cash-out.');
  },
};
