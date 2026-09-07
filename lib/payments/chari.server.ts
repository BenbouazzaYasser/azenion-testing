/**
 * Chari (ChariBaaS) provider adapter — SERVER ONLY.
 *
 * Implements the VERIFIED merchant card-payment contract (ChariBaaS API
 * reference v2.3; operations-based endpoints). This module must never be
 * imported from client components: it reads server-only credentials and
 * performs provider calls.
 *
 * Verified facts encoded here:
 * - Auth: `Chari-Api-Key` header (per-environment key) + `C-Request-Id`
 *   (UUIDv4) tracing header, echoed back by the provider.
 * - Collect: POST /api/operations/merchant/payment/card?phoneNumber=<merchant>
 *   with card-holder fields, autoCapture, notificationUrl/acceptUrl/
 *   declineUrl, externalReference. Response carries orderId (CH…),
 *   transactionTrackId, redirectionURL for hosted 3DS.
 * - Status: GET /api/operations/{operationId}?phoneNumber=<merchant>.
 * - Refund: POST /api/operations/merchant/payment/card/refund (scope
 *   operations:refund).
 * - Webhooks: shared-secret X-Api-Key header (constant-time compare); event
 *   model payment.card.authorized / payment.received / payment.refunded /
 *   payment.failed. There is NO /v1/* API and NO HMAC design.
 *
 * Explicitly NOT implemented: authorize/capture split, reverse, tokenized
 * cards, QR, wallets, bills. v1 = autoCapture card collect + refund only.
 *
 * Required env (server-only, never NEXT_PUBLIC_*):
 *   CHARI_API_KEY, CHARI_BASE_URL, CHARI_WEBHOOK_SECRET, CHARI_MERCHANT_PHONE
 */

import "server-only";

import { toProviderAmount } from "@/lib/payments/money";

// ── Verified OperationStatus codes ──────────────────────────────────────────

export const OPERATION_OPEN = 1;
export const OPERATION_COMPLETED = 2;
export const OPERATION_FAILED = 3;
export const OPERATION_CANCELED = 4;

// ── Verified webhook EventIds we act on ─────────────────────────────────────

export const EVENT_AUTHORIZED = "payment.card.authorized";
export const EVENT_RECEIVED = "payment.received";
export const EVENT_REFUNDED = "payment.refunded";
export const EVENT_FAILED = "payment.failed";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ChariCollectResult {
  orderId: string;
  transactionTrackId: string;
  transactionReferenceId: string | null;
  redirectionURL: string;
  responseCode: number;
  amount: number;
}

export interface ChariOperation {
  operationId: number;
  operationType: number;
  transactionStatus: number;
  amount: number;
  totalAmount: number;
  sender: string | null;
  receiver: string | null;
}

export interface ChariRefundResult {
  operationId: number;
  refundAmount: number;
  orderId: string;
  transactionTrackId: string;
}

export interface ChariWebhookEvent {
  webhookId: number;
  eventId: string;
  requestId: string | null;
  operationId: number;
  operationType: number;
  operationStatus: number;
  amount: number;
  feeAmount: number;
  gatewayOrderId: string | null;
  gatewayTrackId: string | null;
  customData: string | null;
}

function config() {
  const apiKey = process.env.CHARI_API_KEY;
  const baseUrl = process.env.CHARI_BASE_URL;
  const merchantPhone = process.env.CHARI_MERCHANT_PHONE;
  const webhookSecret = process.env.CHARI_WEBHOOK_SECRET;
  if (!apiKey || !baseUrl || !merchantPhone || !webhookSecret) {
    throw new Error(
      "Missing Chari configuration: CHARI_API_KEY, CHARI_BASE_URL, " +
        "CHARI_MERCHANT_PHONE and CHARI_WEBHOOK_SECRET must be set.",
    );
  }
  return { apiKey, baseUrl, merchantPhone, webhookSecret };
}

async function chariFetch(
  path: string,
  init: RequestInit,
  requestId: string,
): Promise<unknown> {
  const { apiKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Chari-Api-Key": apiKey,
      "C-Request-Id": requestId,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Chari API error ${response.status}: ${body.slice(0, 200)}`);
  }
  return (await response.json()) as unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) throw new Error("Unexpected Chari response shape");
  return value as Record<string, unknown>;
}

// ── Preview ─────────────────────────────────────────────────────────────────

export async function previewPayment(args: {
  amountCents: number;
  requestId: string;
}): Promise<{ feesAmount: number }> {
  const { merchantPhone } = config();
  const data = asRecord(
    await chariFetch(
      `/api/operations/merchant/payment/card/preview?phoneNumber=${encodeURIComponent(merchantPhone)}`,
      { method: "POST", body: JSON.stringify({ amount: toProviderAmount(args.amountCents) }) },
      args.requestId,
    ),
  );
  const inner = asRecord(data["data"]);
  return { feesAmount: typeof inner["feesAmount"] === "number" ? inner["feesAmount"] : 0 };
}

// ── Collect (autoCapture) ───────────────────────────────────────────────────

export async function createPayment(args: {
  amountCents: number;
  externalReference: string;
  notificationUrl: string;
  acceptUrl: string;
  declineUrl: string;
  requestId: string;
}): Promise<ChariCollectResult> {
  const { merchantPhone } = config();
  const data = asRecord(
    await chariFetch(
      `/api/operations/merchant/payment/card?phoneNumber=${encodeURIComponent(merchantPhone)}`,
      {
        method: "POST",
        body: JSON.stringify({
          // NOTE: hosted-3DS collect. PAN/CVV are entered on the provider's
          // hosted page after redirect; our server never sees card data.
          // Card-holder PII fields are supplied by the provider flow.
          amount: toProviderAmount(args.amountCents),
          autoCapture: true,
          notificationUrl: args.notificationUrl,
          acceptUrl: args.acceptUrl,
          declineUrl: args.declineUrl,
          externalReference: args.externalReference,
        }),
      },
      args.requestId,
    ),
  );
  const inner = asRecord(data["data"]);
  if (typeof inner["orderId"] !== "string" || typeof inner["transactionTrackId"] !== "string") {
    throw new Error("Chari collect response missing orderId/transactionTrackId");
  }
  return {
    orderId: inner["orderId"] as string,
    transactionTrackId: inner["transactionTrackId"] as string,
    transactionReferenceId:
      typeof inner["transactionReferenceId"] === "string" ? inner["transactionReferenceId"] : null,
    redirectionURL: typeof inner["redirectionURL"] === "string" ? inner["redirectionURL"] : "",
    responseCode: typeof inner["responseCode"] === "number" ? inner["responseCode"] : -1,
    amount: typeof inner["amount"] === "number" ? inner["amount"] : 0,
  };
}

// ── Status (authoritative re-verification source) ───────────────────────────

export async function getOperation(args: {
  operationId: number;
  requestId: string;
}): Promise<ChariOperation> {
  const { merchantPhone } = config();
  const data = asRecord(
    await chariFetch(
      `/api/operations/${args.operationId}?phoneNumber=${encodeURIComponent(merchantPhone)}`,
      { method: "GET" },
      args.requestId,
    ),
  );
  const inner = asRecord(data["data"]);
  return {
    operationId: typeof inner["operationId"] === "number" ? inner["operationId"] : args.operationId,
    operationType: typeof inner["operationType"] === "number" ? inner["operationType"] : 0,
    transactionStatus: typeof inner["transactionStatus"] === "number" ? inner["transactionStatus"] : 0,
    amount: typeof inner["amount"] === "number" ? inner["amount"] : 0,
    totalAmount: typeof inner["totalAmount"] === "number" ? inner["totalAmount"] : 0,
    sender: typeof inner["sender"] === "string" ? inner["sender"] : null,
    receiver: typeof inner["receiver"] === "string" ? inner["receiver"] : null,
  };
}

// ── Refund (provider-first; local rows follow webhooks, never precede) ──────

export async function refundPayment(args: {
  operationId: number;
  orderId: string;
  transactionTrackId: string;
  refundAmountCents?: number;
  requestId: string;
}): Promise<ChariRefundResult> {
  const { merchantPhone } = config();
  const body: Record<string, unknown> = {
    phoneNumber: merchantPhone,
    operationId: args.operationId,
    orderId: args.orderId,
    transactionTrackId: args.transactionTrackId,
  };
  if (args.refundAmountCents != null) {
    // Partial refund. Throws until amount units are confirmed (fail-closed).
    body["refundAmount"] = toProviderAmount(args.refundAmountCents);
  }
  const data = asRecord(
    await chariFetch(`/api/operations/merchant/payment/card/refund`, {
      method: "POST",
      body: JSON.stringify(body),
    }, args.requestId),
  );
  const inner = asRecord(data["data"]);
  return {
    operationId: typeof inner["operationId"] === "number" ? inner["operationId"] : args.operationId,
    refundAmount: typeof inner["refundAmount"] === "number" ? inner["refundAmount"] : 0,
    orderId: typeof inner["orderId"] === "string" ? inner["orderId"] : args.orderId,
    transactionTrackId:
      typeof inner["transactionTrackId"] === "string" ? inner["transactionTrackId"] : args.transactionTrackId,
  };
}

// ── Webhook verification (shared-secret header, constant-time) ──────────────
// There is no HMAC design in the verified contract. Authentication is the
// X-Api-Key header compared in constant time against our secret. The raw body
// must be read BEFORE parsing (callers pass request.text()).

export function verifyWebhook(rawBody: string, headers: Headers): { ok: boolean; event: ChariWebhookEvent | null; error?: string } {
  const { webhookSecret } = config();
  const received = headers.get("X-Api-Key");
  if (!received || !constantTimeEqual(received, webhookSecret)) {
    return { ok: false, event: null, error: "Invalid webhook signature" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, event: null, error: "Invalid JSON" };
  }
  const data = asRecord(parsed)["data"];
  if (!data) return { ok: false, event: null, error: "Missing data envelope" };
  const inner = asRecord(data);
  if (typeof inner["EventId"] !== "string" || typeof inner["OperationId"] !== "number") {
    return { ok: false, event: null, error: "Malformed webhook payload" };
  }
  return {
    ok: true,
    event: {
      webhookId: typeof inner["WebhookId"] === "number" ? inner["WebhookId"] : 0,
      eventId: inner["EventId"] as string,
      requestId: typeof inner["CRequestId"] === "string" ? inner["CRequestId"] : null,
      operationId: inner["OperationId"] as number,
      operationType: typeof inner["OperationType"] === "number" ? inner["OperationType"] : 0,
      operationStatus: typeof inner["OperationStatus"] === "number" ? inner["OperationStatus"] : 0,
      amount: typeof inner["Amount"] === "number" ? inner["Amount"] : 0,
      feeAmount: typeof inner["FeeAmount"] === "number" ? inner["FeeAmount"] : 0,
      gatewayOrderId: typeof inner["GatewayOrderId"] === "string" ? inner["GatewayOrderId"] : null,
      gatewayTrackId: typeof inner["GatewayTrackId"] === "string" ? inner["GatewayTrackId"] : null,
      customData: typeof inner["CustomData"] === "string" ? inner["CustomData"] : null,
    },
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Compare against self to keep timing flat, then fail.
    let diff = 1;
    for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ ab[i]!;
    void diff;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

/**
 * Business-event identity for webhook_events.provider_event_id.
 * Default: the echoed CRequestId (our per-checkout UUID). Fallback:
 * EventId:OperationId when the provider omits the echo. C-Webhook-Id is
 * delivery-level only and must never be used here. The fallback branch
 * exists so the identity can be switched without a schema rewrite.
 */
export function businessEventId(event: Pick<ChariWebhookEvent, "requestId" | "eventId" | "operationId">): string {
  if (event.requestId) return event.requestId;
  return `${event.eventId}:${event.operationId}`;
}
