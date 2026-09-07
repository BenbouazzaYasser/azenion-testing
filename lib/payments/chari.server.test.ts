import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  businessEventId,
  createPayment,
  getOperation,
  refundPayment,
  verifyWebhook,
} from "@/lib/payments/chari.server";

vi.mock("@/lib/payments/money", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/money")>();
  // Identity conversion for mapping tests only. Production stays fail-closed
  // because the real money.ts throws until units are confirmed.
  return { ...actual, toProviderAmount: (n: number) => n, fromProviderAmount: (n: number) => n };
});

const SECRET = "test-webhook-secret-0123456789abcdef";
const HEADERS = { "Chari-Api-Key": "k", "C-Request-Id": "req-1" };

function webhookHeaders(secret = SECRET): Headers {
  process.env.CHARI_API_KEY = "k";
  process.env.CHARI_BASE_URL = "https://sandbox.example";
  process.env.CHARI_MERCHANT_PHONE = "+212600000000";
  process.env.CHARI_WEBHOOK_SECRET = secret;
  return new Headers({ "X-Api-Key": secret });
}

function mockFetchJson(payload: unknown, ok = true) {
  const mock = vi.fn(async () =>
    ok
      ? ({ ok: true, json: async () => payload } as Response)
      : ({ ok: false, status: 400, text: async () => "bad" } as unknown as Response),
  );
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function firstCall(mock: { mock: { calls: unknown[][] } }): [string, RequestInit] {
  const call = mock.mock.calls[0];
  if (!call) throw new Error("expected a fetch call");
  return call as [string, RequestInit];
}

describe("verifyWebhook", () => {
  it("accepts a correctly signed payload parsed from the raw body", () => {
    const raw = JSON.stringify({
      data: {
        WebhookId: 1,
        EventId: "payment.card.authorized",
        CRequestId: "req-1",
        OperationId: 42,
        OperationType: 24,
        OperationStatus: 2,
        Amount: 250,
      },
    });
    const result = verifyWebhook(raw, webhookHeaders());
    expect(result.ok).toBe(true);
    expect(result.event?.eventId).toBe("payment.card.authorized");
    expect(result.event?.operationId).toBe(42);
  });

  it("rejects missing/invalid signatures and non-JSON bodies", () => {
    const raw = JSON.stringify({ data: { EventId: "x", OperationId: 1 } });
    webhookHeaders();
    expect(verifyWebhook(raw, new Headers()).ok).toBe(false);
    expect(verifyWebhook(raw, new Headers({ "X-Api-Key": "wrong-secret" })).ok).toBe(false);
    expect(verifyWebhook("not-json{", webhookHeaders()).ok).toBe(false);
    expect(verifyWebhook(JSON.stringify({ nope: true }), webhookHeaders()).ok).toBe(false);
  });

  it("rejects the fictional HMAC design and legacy event names", () => {
    const raw = JSON.stringify({
      data: { EventId: "payment.completed", OperationId: 1 },
    });
    const result = verifyWebhook(raw, webhookHeaders());
    // Shape parses (shape-level check only); the transition layer, not the
    // verifier, is responsible for ignoring unknown events.
    expect(result.ok).toBe(true);
    expect(result.event?.eventId).toBe("payment.completed");
  });
});

describe("businessEventId", () => {
  it("prefers the echoed CRequestId and falls back without schema change", () => {
    expect(businessEventId({ requestId: "req-1", eventId: "payment.card.authorized", operationId: 42 })).toBe("req-1");
    expect(businessEventId({ requestId: null, eventId: "payment.card.authorized", operationId: 42 })).toBe(
      "payment.card.authorized:42",
    );
  });
});

describe("adapter request/response mapping", () => {
  beforeEach(() => {
    webhookHeaders();
    vi.restoreAllMocks();
  });

  it("creates payments against the verified operations endpoint (never /v1/*)", async () => {
    const fetchMock = mockFetchJson({
      data: { orderId: "CH1", transactionTrackId: "T1", transactionReferenceId: "R1", redirectionURL: "https://pay.example/3ds", responseCode: 0, amount: 250 },
    });
    const result = await createPayment({
      amountCents: 25000,
      externalReference: "acad_pay-1",
      notificationUrl: "https://app.example/api/academy/payments/webhook",
      acceptUrl: "https://app.example/ok",
      declineUrl: "https://app.example/no",
      requestId: "req-1",
    });
    expect(result.orderId).toBe("CH1");
    expect(result.redirectionURL).toBe("https://pay.example/3ds");
    const [url, init] = firstCall(fetchMock);
    expect(url).toContain("/api/operations/merchant/payment/card?phoneNumber=");
    expect(url).not.toContain("/v1/");
    const body = JSON.parse(init.body as string);
    expect(body.autoCapture).toBe(true);
    expect(body.externalReference).toBe("acad_pay-1");
    expect(body).not.toHaveProperty("pan");
    expect(body).not.toHaveProperty("cvv");
    expect((init.headers as Record<string, string>)["Chari-Api-Key"]).toBe("k");
    expect((init.headers as Record<string, string>)["C-Request-Id"]).toBe("req-1");
  });

  it("maps GET operation and refund bodies", async () => {
    const fetchMock = mockFetchJson({ data: { operationId: 7, operationType: 24, transactionStatus: 2, amount: 250, totalAmount: 250 } });
    const op = await getOperation({ operationId: 7, requestId: "req-1" });
    expect(op.transactionStatus).toBe(2);
    const [statusUrl] = firstCall(fetchMock);
    expect(statusUrl).toContain("/api/operations/7?phoneNumber=");

    mockFetchJson({ data: { operationId: 7, refundAmount: 100, orderId: "CH1", transactionTrackId: "T1" } });
    mockFetchJson({ data: { operationId: 7, refundAmount: 100, orderId: "CH1", transactionTrackId: "T1" } });
    const refund = await refundPayment({ operationId: 7, orderId: "CH1", transactionTrackId: "T1", refundAmountCents: 10000, requestId: "req-1" });
    expect(refund.refundAmount).toBe(100);
    const refundMock = global.fetch as unknown as { mock: { calls: unknown[][] } };
    const [refundUrl, refundInit] = firstCall(refundMock);
    expect(refundUrl).toContain("/api/operations/merchant/payment/card/refund");
    expect(JSON.parse(refundInit.body as string)).toMatchObject({ operationId: 7 });
  });
});
