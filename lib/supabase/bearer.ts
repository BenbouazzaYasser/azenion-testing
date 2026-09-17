import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

/**
 * Single reusable bearer authentication primitive for token-authenticated
 * Next.js route handlers (Phase 0B; future native-client boundary).
 *
 * Contract:
 *   - Accepts a `Request` or a raw `Authorization` header value.
 *   - Requires exactly `Bearer <access_token>`; anything else is a 401.
 *   - Validates the token through Supabase Auth via `auth.getUser(token)`.
 *     JWT claims are never decoded manually as a substitute for validation.
 *   - Returns the validated `user` plus a user-JWT Supabase client whose
 *     PostgREST calls carry the caller's token (so RLS and `auth.uid()`
 *     resolve to the caller). The service-role key is never used here.
 *   - The access token is never written to logs or error responses.
 *   - Fails closed: any missing/invalid/error state is 401.
 *
 * Do NOT create a second bearer implementation elsewhere; all future
 * token-authenticated routes must use `authenticateBearer`.
 */

export interface BearerPrincipal {
  user: User;
  supabase: SupabaseClient<Database>;
}

export type BearerResult =
  | { ok: true; principal: BearerPrincipal }
  | { ok: false; status: 401; error: string };

const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

export function extractBearerToken(
  input: Request | string | null | undefined,
): string | null {
  const header =
    input == null
      ? null
      : typeof input === "string"
        ? input
        : input.headers.get("authorization");
  if (!header) return null;
  const match = BEARER_PATTERN.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;
  return token;
}

function unauthorized(): BearerResult {
  return { ok: false, status: 401, error: "Unauthorized" };
}

export async function authenticateBearer(
  input: Request | string | null | undefined,
): Promise<BearerResult> {
  const token = extractBearerToken(input);
  if (!token) return unauthorized();

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createSupabaseClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithTimeout,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return unauthorized();
    user = data.user;
  } catch {
    return unauthorized();
  }

  if (!user) return unauthorized();

  return { ok: true, principal: { user, supabase } };
}
