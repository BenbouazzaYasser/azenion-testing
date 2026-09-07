import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  verifyWebhook,
  getOperation,
  businessEventId,
  type ChariWebhookEvent,
} from "@/lib/payments/chari.server";
import { fromProviderAmount } from "@/lib/payments/money";
import {
  decideTransition,
  type LocalPaymentStatus,
} from "@/lib/payments/transitions";

export const dynamic = "force-dynamic";

interface PaymentRow {
  id: string;
  user_id: string;
  course_id: string;
  amount_cents: number;
  status: string;
  provider_data: Record<string, unknown>;
}

/**
 * Chari webhook receiver. Auth = constant-time X-Api-Key comparison (there is
 * no HMAC design in the verified contract). Event names trigger
 * reconciliation only: every state transition additionally requires the
 * authoritative GET operation result. Duplicate deliveries converge on
 * UNIQUE(provider, provider_event_id); out-of-order events cannot grant
 * because transitions are status-gated.
 */
export async function POST(request: NextRequest) {
  const rateKey = request.headers.get("C-Webhook-Id") ?? "unknown";
  const limit = await checkRateLimit("payments-webhook", rateKey, 120, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Raw body BEFORE parsing (required for any future signature scheme).
  const rawBody = await request.text();
  const verified = verifyWebhook(rawBody, request.headers);
  if (!verified.ok || !verified.event) {
    return NextResponse.json({ error: verified.error ?? "Invalid webhook" }, { status: 400 });
  }
  const event = verified.event;
  const admin = createAdminClient();
  const dedupeKey = businessEventId(event);

  // Idempotency insert FIRST: concurrent duplicates fail here (23505) and ACK.
  const { error: idemError } = await admin.from("webhook_events").insert({
    provider: "chari",
    event_type: event.eventId,
    provider_event_id: dedupeKey,
    provider_data: {
      webhookId: event.webhookId,
      operationId: event.operationId,
      gatewayOrderId: event.gatewayOrderId,
      customData: event.customData,
    },
    status: "pending",
  });
  if (idemError) {
    if ((idemError as { code?: string }).code === "23505") {
      // Same business event seen before. If the previous attempt finished
      // (processed/failed), ACK without reprocessing. If it is still pending,
      // the previous attempt crashed mid-flight: fall through and reprocess
      // with the same convergent writes below.
      const { data: existing } = await admin
        .from("webhook_events")
        .select("status")
        .eq("provider", "chari")
        .eq("provider_event_id", dedupeKey)
        .maybeSingle();
      const existingStatus = (existing as unknown as { status: string } | null)?.status;
      if (existingStatus && existingStatus !== "pending") {
        return NextResponse.json({ received: true, idempotent: true });
      }
    } else {
      return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 });
    }
  }

  try {
    return await processEvent(admin, event, dedupeKey);
  } catch (err) {
    // Write failure: the event row stays pending so the provider retry
    // reprocesses convergently instead of wedging on partial state.
    console.error("webhook processing failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: ChariWebhookEvent,
  dedupeKey: string,
) {
  // Correlate to our payment: echoed CRequestId first, CustomData payment id second.
  const payment = await findPayment(admin, event);
  if (!payment) {
    await markEvent(admin, dedupeKey, "failed", { reason: "uncorrelated" });
    return NextResponse.json({ received: true, uncorrelated: true });
  }

  // Authoritative verification. Network failure → 500 so the provider retries;
  // the event stays pending and no state changes.
  let operation: Awaited<ReturnType<typeof getOperation>> | null = null;
  try {
    operation = await getOperation({ operationId: event.operationId, requestId: crypto.randomUUID() });
  } catch (err) {
    console.error("webhook GET operation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Verification unavailable" }, { status: 500 });
  }

  // Amount match is only computable once units are confirmed; until then it
  // is null, which forces no_transition on any grant path (fail-closed).
  let amountMatches: boolean | null = null;
  try {
    amountMatches = fromProviderAmount(operation.amount) === payment.amount_cents;
  } catch {
    amountMatches = null;
  }

  const cumulative = await cumulativeRefundedCents(admin, payment.id);
  // A refund whose amount cannot be verified must not move money state:
  // null forces no_transition in decideTransition (fail-closed).
  let eventRefundCents: number | null = null;
  if (event.eventId === "payment.refunded") {
    try {
      eventRefundCents = fromProviderAmount(event.amount);
    } catch {
      eventRefundCents = null;
    }
  } else {
    eventRefundCents = 0;
  }

  const decision = decideTransition({
    currentStatus: payment.status as LocalPaymentStatus,
    eventId: event.eventId,
    verifiedStatus: operation.transactionStatus,
    amountMatches,
    cumulativeRefundedCents: cumulative,
    eventRefundCents,
    paymentAmountCents: payment.amount_cents,
  });

  await applyDecision(admin, payment, event, operation.operationId, decision.action, eventRefundCents);
  await markEvent(admin, dedupeKey, decision.action === "no_transition" ? "failed" : "processed", {
    decision: decision.action,
    reason: decision.reason,
  });
  return NextResponse.json({ received: true });
}

async function findPayment(
  admin: ReturnType<typeof createAdminClient>,
  event: ChariWebhookEvent,
): Promise<PaymentRow | null> {
  if (event.requestId) {
    const { data } = await admin
      .from("payments")
      .select("id, user_id, course_id, amount_cents, status, provider_data")
      .eq("provider", "chari")
      .filter("provider_data->>requestId", "eq", event.requestId)
      .maybeSingle();
    if (data) return data as unknown as PaymentRow;
  }
  const custom = event.customData ? safeParseCustom(event.customData) : null;
  if (custom?.pay) {
    const { data } = await admin
      .from("payments")
      .select("id, user_id, course_id, amount_cents, status, provider_data")
      .eq("id", custom.pay)
      .maybeSingle();
    if (data) return data as unknown as PaymentRow;
  }
  return null;
}

function safeParseCustom(raw: string): { pay?: string } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "pay" in parsed) {
      const pay = (parsed as Record<string, unknown>)["pay"];
      if (typeof pay === "string") return { pay };
    }
  } catch {
    // not JSON — ignore
  }
  return null;
}

async function cumulativeRefundedCents(
  admin: ReturnType<typeof createAdminClient>,
  paymentId: string,
): Promise<number> {
  const { data: allocations } = await admin
    .from("payment_allocations")
    .select("id")
    .eq("payment_id", paymentId);
  const ids = ((allocations as Array<{ id: string }> | null) ?? []).map((a) => a.id);
  if (ids.length === 0) return 0;
  const { data: refunds } = await admin.from("refunds").select("amount_cents").in("allocation_id", ids);
  return ((refunds as Array<{ amount_cents: number }> | null) ?? []).reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0,
  );
}

/** Throw on unexpected write errors; unique violations (23505) mean a
 *  concurrent attempt already converged the same row — safe to continue. */
async function checked(
  promise: PromiseLike<{ error: unknown }>,
  op: string,
): Promise<void> {
  const { error } = await promise;
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`webhook write failed (${op}): ${JSON.stringify(error).slice(0, 200)}`);
  }
}

async function applyDecision(
  admin: ReturnType<typeof createAdminClient>,
  payment: PaymentRow,
  event: ChariWebhookEvent,
  operationId: number,
  action: string,
  eventRefundCents: number | null,
): Promise<void> {
  const providerData = { ...(payment.provider_data ?? {}), operationId };
  if (action === "grant") {
    await checked(
      admin.from("payments").update({ status: "succeeded", provider_data: providerData }).eq("id", payment.id),
      "payments-succeeded",
    );
    await checked(
      admin.from("entitlements").upsert(
        { user_id: payment.user_id, course_id: payment.course_id, status: "active" },
        { onConflict: "user_id,course_id" },
      ),
      "entitlement-upsert",
    );
    const { data: existing } = await admin
      .from("payment_allocations")
      .select("id")
      .eq("payment_id", payment.id)
      .eq("allocation_type", "initial")
      .eq("course_id", payment.course_id)
      .maybeSingle();
    if (!existing) {
      await checked(
        admin.from("payment_allocations").insert({
          payment_id: payment.id,
          course_id: payment.course_id,
          beneficiary_user_id: payment.user_id,
          beneficiary_type: "student",
          amount_cents: payment.amount_cents,
          allocation_type: "initial",
          payout_status: "completed",
        }),
        "initial-allocation",
      );
    }
    return;
  }
  if (action === "fail") {
    await checked(
      admin.from("payments").update({ status: "failed", provider_data: providerData }).eq("id", payment.id),
      "payments-failed",
    );
    return;
  }
  if (action === "refund_full" || action === "refund_partial") {
    if (eventRefundCents == null) return; // decided no_transition upstream; defensive only
    const { data: initial } = await admin
      .from("payment_allocations")
      .select("id")
      .eq("payment_id", payment.id)
      .eq("allocation_type", "initial")
      .maybeSingle();
    const initialRow = initial as unknown as { id: string } | null;
    if (!initialRow) {
      // Out-of-order refund with no initial allocation yet: the event row is
      // recorded, but no ledger writes happen. A later event replays this.
      console.error("webhook refund without initial allocation", { payment: payment.id });
      return;
    }
    // Skip inserts when this exact refund was already recorded (crash replay
    // after a partial write); final-state updates below are idempotent, so
    // reprocessing always converges instead of double-recording.
    const { data: prior } = await admin
      .from("refunds")
      .select("id")
      .eq("allocation_id", initialRow.id)
      .eq("amount_cents", eventRefundCents);
    const alreadyRecorded = ((prior as Array<{ id: string }> | null) ?? []).length > 0;
    if (!alreadyRecorded) {
      await checked(
        admin.from("refunds").insert({
          allocation_id: initialRow.id,
          amount_cents: eventRefundCents,
          reason: "provider_refund",
          status: "processed",
        }),
        "refund-insert",
      );
      await checked(
        admin.from("payment_allocations").insert({
          payment_id: payment.id,
          course_id: payment.course_id,
          beneficiary_user_id: payment.user_id,
          beneficiary_type: "student",
          amount_cents: eventRefundCents,
          allocation_type: "clawback",
          payout_status: "completed",
        }),
        "clawback-insert",
      );
    }
    if (action === "refund_full") {
      await checked(
        admin.from("payments").update({ status: "refunded", provider_data: providerData }).eq("id", payment.id),
        "payments-refunded",
      );
      await checked(
        admin
          .from("entitlements")
          .update({ status: "cancelled" })
          .eq("user_id", payment.user_id)
          .eq("course_id", payment.course_id),
        "entitlement-cancel",
      );
    }
    return;
  }
  // record_only / no_transition: no state writes.
}

async function markEvent(
  admin: ReturnType<typeof createAdminClient>,
  dedupeKey: string,
  status: string,
  note: Record<string, unknown>,
): Promise<void> {
  await checked(
    admin
      .from("webhook_events")
      .update({ status, provider_data: note })
      .eq("provider", "chari")
      .eq("provider_event_id", dedupeKey),
    "webhook-mark",
  );
}
