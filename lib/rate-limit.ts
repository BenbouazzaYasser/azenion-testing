/**
 * Minimal rate-limit abstraction (server-only).
 *
 * Explicitly scoped: this is NOT production-grade distributed rate limiting.
 * It is the smallest durable mechanism that works on serverless without a new
 * vendor: attempts are logged to public.rate_limit_attempts (service-role
 * only, see 00126) and counted per (scope, key, window). Use it to blunt
 * abuse on sensitive routes (payment checkout, provider webhook) until a
 * dedicated solution is adopted.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitDecision> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("key", key)
    .gte("attempted_at", since);
  if (countError) {
    // Fail open for availability on counter errors? No — fail CLOSED for
    // abuse-sensitive scopes: deny when the limiter itself is broken.
    return { allowed: false, remaining: 0 };
  }
  const used = count ?? 0;
  if (used >= limit) return { allowed: false, remaining: 0 };
  await admin.from("rate_limit_attempts").insert({ scope, key });
  return { allowed: true, remaining: limit - used - 1 };
}

/** Best-effort prune of attempts older than the given age (service-role). */
export async function pruneRateLimitAttempts(olderThanSeconds: number): Promise<void> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - olderThanSeconds * 1000).toISOString();
  await admin.from("rate_limit_attempts").delete().lt("attempted_at", cutoff);
}
