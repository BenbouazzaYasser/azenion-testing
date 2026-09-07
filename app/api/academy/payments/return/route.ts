import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Provider return (accept/decline) handler. UX-ONLY: validates the local
 * payment reference, then redirects to the courses page with a status flag
 * for the entitlement display. This route NEVER grants entitlement, NEVER
 * writes payment state, and NEVER trusts the return as proof of payment —
 * final confirmation comes exclusively from the verified webhook path.
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const result = request.nextUrl.searchParams.get("result") === "accept" ? "success" : "cancelled";
  if (!ref) {
    return NextResponse.redirect(new URL("/academy/courses?payment=error", request.url));
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/academy/courses?payment=error", request.url));
  }
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id")
    .filter("provider_data->>externalReference", "eq", ref)
    .maybeSingle();
  const row = payment as unknown as { user_id: string } | null;
  if (!row || row.user_id !== user.id) {
    return NextResponse.redirect(new URL("/academy/courses?payment=error", request.url));
  }
  return NextResponse.redirect(new URL(`/academy/courses?payment=${result}`, request.url));
}
