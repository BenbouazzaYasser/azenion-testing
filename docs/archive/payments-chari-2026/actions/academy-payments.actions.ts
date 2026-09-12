"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertChargeableCurrency } from "@/lib/payments/money";
import {
  createCheckoutSchema,
  type CreateCheckoutForm,
} from "@/lib/validations/payment.validation";
import { createPayment, previewPayment } from "@/lib/payments/chari.server";

export interface CheckoutResult {
  success: boolean;
  redirectUrl?: string;
  paymentId?: string;
  alreadyHasAccess?: boolean;
  error?: string;
}

interface CoursePricingRow {
  id: string;
  title: string;
  is_free: boolean | null;
  price_cents: number | null;
  currency: string | null;
  status: string | null;
  created_by: string | null;
}

async function callerHasCourseAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  course: CoursePricingRow,
): Promise<boolean> {
  if (course.created_by === userId) return true;
  const { data: manages } = await supabase.rpc("is_course_manager");
  if (manages === true) return true;
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return entitlement != null;
}

/**
 * Canonical checkout entry point (the ONLY server-side path that initiates a
 * provider payment). There is intentionally no separate /checkout HTTP route:
 * client components call this action directly, so validation and business
 * logic live in exactly one place.
 *
 * Price, currency, publish state and access all come from server-loaded data.
 * Client-supplied price is never accepted (the form carries courseId only).
 * The pending payment row and correlation identifiers are persisted BEFORE
 * any provider interaction. Provider execution is fail-closed until amount
 * units are confirmed (see lib/payments/money.ts).
 */
export async function createCheckout(form: CreateCheckoutForm): Promise<CheckoutResult> {
  const validated = createCheckoutSchema.safeParse(form);
  if (!validated.success) {
    return { success: false, error: "Invalid course ID" };
  }
  const { courseId } = validated.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, is_free, price_cents, currency, status, created_by")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError || !course) {
    return { success: false, error: "Course not found" };
  }
  const pricing = course as unknown as CoursePricingRow;

  if (pricing.status !== "published" || pricing.is_free !== false) {
    return { success: false, error: "Course not available for purchase" };
  }
  const priceCents = pricing.price_cents ?? 0;
  if (priceCents <= 0) {
    return { success: false, error: "Invalid course price" };
  }
  try {
    assertChargeableCurrency(pricing.currency ?? "");
  } catch {
    return { success: false, error: "Unsupported course currency" };
  }

  if (await callerHasCourseAccess(supabase, user.id, pricing)) {
    return { success: false, alreadyHasAccess: true, error: "Already has access" };
  }

  const allowed = await checkRateLimit("payments-checkout", user.id, 5, 3600);
  if (!allowed.allowed) {
    return { success: false, error: "Too many checkout attempts. Try again later." };
  }

  // Correlation identifiers, generated once and persisted before any provider call.
  const paymentId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const externalReference = `acad_${paymentId}`;

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("payments").insert({
    id: paymentId,
    user_id: user.id,
    course_id: courseId,
    amount_cents: priceCents,
    currency: pricing.currency,
    status: "pending",
    provider: "chari",
    provider_data: { requestId, externalReference },
  });
  if (insertError) {
    return { success: false, error: "Could not initiate checkout" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    await previewPayment({ amountCents: priceCents, requestId });
    const collect = await createPayment({
      amountCents: priceCents,
      externalReference,
      notificationUrl: `${appUrl}/api/academy/payments/webhook`,
      acceptUrl: `${appUrl}/api/academy/payments/return?ref=${externalReference}&result=accept`,
      declineUrl: `${appUrl}/api/academy/payments/return?ref=${externalReference}&result=decline`,
      requestId,
    });
    await admin
      .from("payments")
      .update({
        provider_data: {
          requestId,
          externalReference,
          orderId: collect.orderId,
          transactionTrackId: collect.transactionTrackId,
          transactionReferenceId: collect.transactionReferenceId,
        },
      })
      .eq("id", paymentId);
    revalidatePath("/academy/courses");
    return { success: true, redirectUrl: collect.redirectionURL, paymentId };
  } catch (err) {
    // Fail-closed: pending row stays pending; no entitlement is granted here
    // under any circumstance. Amount-unit confirmation errors surface here.
    const message = err instanceof Error ? err.message : "Payment creation failed";
    return { success: false, error: message, paymentId };
  }
}

/** User-scoped active-entitlement read for purchase UI state. */
export async function getMyEntitlement(courseId: string): Promise<{ hasAccess: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasAccess: false };
  const { data } = await supabase
    .from("entitlements")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return { hasAccess: data != null };
}

export interface RefundRequestResult {
  success: boolean;
  error?: string;
}

/**
 * Provider-first refund request. Executes the provider refund; local refund
 * rows, clawback allocations and entitlement changes happen exclusively via
 * the verified webhook path — never here.
 */
export async function requestRefund(
  paymentId: string,
  amountCents?: number,
): Promise<RefundRequestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("id, user_id, amount_cents, status, provider_data")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !payment) return { success: false, error: "Payment not found" };
  const row = payment as unknown as {
    user_id: string;
    amount_cents: number;
    status: string;
    provider_data: Record<string, unknown>;
  };
  if (row.user_id !== user.id) {
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) return { success: false, error: "Not authorized" };
  }
  if (row.status !== "succeeded") {
    return { success: false, error: "Only succeeded payments can be refunded" };
  }
  if (amountCents != null && (amountCents <= 0 || amountCents > row.amount_cents)) {
    return { success: false, error: "Invalid refund amount" };
  }
  const providerData = (row.provider_data ?? {}) as Record<string, unknown>;
  const operationId = providerData["operationId"];
  const orderId = providerData["orderId"];
  const transactionTrackId = providerData["transactionTrackId"];
  if (typeof operationId !== "number" || typeof orderId !== "string" || typeof transactionTrackId !== "string") {
    return { success: false, error: "Payment is missing provider references" };
  }
  try {
    const { refundPayment } = await import("@/lib/payments/chari.server");
    await refundPayment({
      operationId,
      orderId,
      transactionTrackId,
      ...(amountCents != null ? { refundAmountCents: amountCents } : {}),
      requestId: crypto.randomUUID(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Refund failed" };
  }
}
