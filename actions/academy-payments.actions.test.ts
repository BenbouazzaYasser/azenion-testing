/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckout, requestRefund } from "@/actions/academy-payments.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/payments/chari.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/chari.server")>();
  return { ...actual, previewPayment: vi.fn(), createPayment: vi.fn(), refundPayment: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPayment, previewPayment, refundPayment } from "@/lib/payments/chari.server";

type Row = Record<string, any>;

/** Chainable query double: every method chains; awaiting resolves {data,error}. */
function query(result: { data?: unknown; error?: unknown }): any {
  const q: any = new Proxy(function () {}, {
    get(_t, prop: string) {
      if (prop === "then") {
        return (resolve: any) => resolve({ data: result.data ?? null, error: result.error ?? null });
      }
      if (prop === "maybeSingle" || prop === "single") {
        return async () => ({ data: result.data ?? null, error: result.error ?? null });
      }
      return (..._a: unknown[]) => q;
    },
  });
  return q;
}

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";
const PAID_COURSE: Row = {
  id: COURSE_ID,
  title: "Paid Course",
  is_free: false,
  price_cents: 5000,
  currency: "mad",
  status: "published",
  created_by: "owner-1",
};

function setupDb(opts: {
  user?: { id: string } | null;
  course?: Row | null;
  rpc?: Record<string, unknown>;
  entitlement?: Row | null;
  paymentRow?: Row | null;
}) {
  const user = opts.user === undefined ? { id: "buyer-1" } : opts.user;
  const tables: Record<string, { data?: unknown; error?: unknown }> = {
    courses: { data: opts.course === undefined ? PAID_COURSE : opts.course },
    entitlements: { data: opts.entitlement ?? null },
    payments: { data: opts.paymentRow ?? null },
  };
  (createClient as any).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => query(tables[table] ?? { data: null }),
    rpc: async (name: string) => ({ data: opts.rpc?.[name] ?? null, error: null }),
  });
  const adminCalls: { table: string; op: string; value: unknown }[] = [];
  (createAdminClient as any).mockReturnValue({
    from: (table: string) => {
      const base = query({ data: null, error: null });
      return new Proxy(base, {
        get(t: any, prop: string) {
          if (prop === "insert" || prop === "update" || prop === "upsert") {
            return (value: unknown) => {
              adminCalls.push({ table, op: prop, value });
              return query({ data: null, error: null });
            };
          }
          return t[prop];
        },
      });
    },
  });
  (checkRateLimit as any).mockResolvedValue({ allowed: true, remaining: 4 });
  return { adminCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
  (previewPayment as any).mockResolvedValue({ feesAmount: 0 });
  (createPayment as any).mockResolvedValue({
    orderId: "CH1",
    transactionTrackId: "T1",
    transactionReferenceId: "R1",
    redirectionURL: "https://pay.example/3ds",
    responseCode: 0,
    amount: 5000,
  });
  (refundPayment as any).mockResolvedValue({ operationId: 1, refundAmount: 100, orderId: "CH1", transactionTrackId: "T1" });
});

describe("createCheckout", () => {
  it("ignores client-supplied price and charges the server-loaded price (tamper-proof)", async () => {
    setupDb({});
    const result = await createCheckout({ courseId: COURSE_ID, price: 1 } as any);
    expect(result.success).toBe(true);
    expect(createPayment).toHaveBeenCalledOnce();
    const args = (createPayment as any).mock.calls[0][0];
    expect(args.amountCents).toBe(5000);
  });

  it("short-circuits already-entitled buyers without provider calls or writes", async () => {
    const { adminCalls } = setupDb({ entitlement: { id: "ent-1" } });
    const result = await createCheckout({ courseId: COURSE_ID });
    expect(result.alreadyHasAccess).toBe(true);
    expect(createPayment).not.toHaveBeenCalled();
    expect(adminCalls.filter((c) => c.table === "payments")).toHaveLength(0);
  });

  it("rejects invalid course state (draft / free)", async () => {
    setupDb({ course: { ...PAID_COURSE, status: "draft" } });
    expect((await createCheckout({ courseId: COURSE_ID })).success).toBe(false);
    setupDb({ course: { ...PAID_COURSE, is_free: true } });
    expect((await createCheckout({ courseId: COURSE_ID })).success).toBe(false);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("fails closed while amount units are unconfirmed (persists pending, no redirect)", async () => {
    const real = await vi.importActual<typeof import("@/lib/payments/chari.server")>(
      "@/lib/payments/chari.server",
    );
    (previewPayment as any).mockImplementationOnce(() => real.previewPayment({ amountCents: 1, requestId: "x" }));
    const { adminCalls } = setupDb({});
    // Env must exist so the failure comes from the unit guard, not config.
    process.env.CHARI_API_KEY = "k";
    process.env.CHARI_BASE_URL = "https://sandbox.example";
    process.env.CHARI_MERCHANT_PHONE = "+212600000000";
    process.env.CHARI_WEBHOOK_SECRET = "s";
    const result = await createCheckout({ courseId: COURSE_ID });
    expect(result.success).toBe(false);
    expect(result.redirectUrl).toBeUndefined();
    expect(result.error).toMatch(/unconfirmed/i);
    // Pending row persisted BEFORE provider interaction; no entitlement path taken.
    expect(adminCalls.some((c) => c.table === "payments" && c.op === "insert")).toBe(true);
  });
});

describe("requestRefund", () => {
  const paymentRow: Row = {
    id: "pay-1",
    user_id: "buyer-1",
    amount_cents: 5000,
    status: "succeeded",
    provider_data: { operationId: 7, orderId: "CH1", transactionTrackId: "T1" },
  };

  it("rejects invalid amounts and unauthorized users without provider calls", async () => {
    setupDb({ paymentRow });
    expect((await requestRefund("pay-1", 6000)).success).toBe(false);
    setupDb({ user: { id: "stranger" }, paymentRow, rpc: {} });
    expect((await requestRefund("pay-1")).success).toBe(false);
    expect(refundPayment).not.toHaveBeenCalled();
  });
});
