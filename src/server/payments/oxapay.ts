import crypto from "node:crypto";
import type {
  CoinPurchaseResult,
  CreateCoinPurchaseParams,
  CreateWithdrawParams,
  PaymentProviderAdapter,
  WebhookResult,
  WithdrawResult,
} from "./types";

const OXAPAY_API_URL = "https://api.oxapay.com/v1/payment/invoice";

function requireMerchantKey() {
  const key = process.env.OXAPAY_MERCHANT_API_KEY;
  if (!key) throw new Error("OXAPAY_MERCHANT_API_KEY is not set.");
  return key;
}

function getAppUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

interface OxaPayInvoiceResponse {
  data?: { track_id?: string; payment_url?: string };
  status?: number;
  message?: string;
  error?: { message?: string } | null;
}

async function createCoinPurchase(
  params: CreateCoinPurchaseParams,
): Promise<CoinPurchaseResult> {
  const merchantKey = requireMerchantKey();
  const response = await fetch(OXAPAY_API_URL, {
    method: "POST",
    headers: {
      merchant_api_key: merchantKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      lifetime: 60,
      callback_url: `${getAppUrl()}/api/payments/webhook`,
      return_url: `${getAppUrl()}/?payment=success`,
      order_id: params.packId ? `${params.userId}:${params.packId}:${params.coins}` : params.userId,
      description: `Coin purchase: ${params.coins} coins`,
      sandbox: process.env.OXAPAY_MODE === "sandbox",
    }),
  });
  const body = (await response.json()) as OxaPayInvoiceResponse;
  const trackId = body.data?.track_id;
  const paymentUrl = body.data?.payment_url;
  if (!response.ok || !trackId || !paymentUrl) {
    throw new Error(
      `OxaPay invoice error (${response.status}): ${body.error?.message ?? body.message ?? "missing invoice data"}`,
    );
  }
  return {
    orderId: trackId,
    approvalUrl: paymentUrl,
    providerRef: trackId,
    status: "pending",
  };
}

function verifyHmac(rawBody: string, headers: Record<string, string>) {
  const signature = headers.hmac ?? headers.HMAC ?? "";
  const expected = crypto
    .createHmac("sha512", requireMerchantKey())
    .update(rawBody)
    .digest("hex");
  const received = Buffer.from(signature.toLowerCase());
  const calculated = Buffer.from(expected.toLowerCase());
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

async function handlePurchaseWebhook(
  body: unknown,
  headers: Record<string, string>,
): Promise<WebhookResult> {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  if (!verifyHmac(rawBody, headers)) {
    throw new Error("OxaPay webhook HMAC verification failed.");
  }
  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const status = String(event.status ?? "").toLowerCase();
  if (String(event.type ?? "").toLowerCase() !== "invoice" || status !== "paid") {
    return { orderId: String(event.order_id ?? ""), userId: "", coins: 0, ok: false };
  }
  const description = String(event.description ?? "");
  const coins = Number(description.match(/(\d+)\s+coins?/i)?.[1] ?? 0);
  return {
    orderId: String(event.order_id ?? ""),
    userId: "",
    coins,
    ok: true,
    providerRef: String(event.track_id ?? ""),
  };
}

async function createWithdraw(_params: CreateWithdrawParams): Promise<WithdrawResult> {
  throw new Error(
    "OxaPay withdrawals require a merchant payout address and payout API key. Configure PAYMENTS_WITHDRAW_PROVIDER=paypal for PayPal cashouts, or add OxaPay payout credentials before enabling crypto cashouts.",
  );
}

export const oxapayProvider: PaymentProviderAdapter = {
  name: "oxapay",
  createCoinPurchase,
  handlePurchaseWebhook,
  createWithdraw,
};
