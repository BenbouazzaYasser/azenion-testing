import { API_BASE_URL } from "./config";
import { supabase } from "./supabase";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

async function request(path: string, init?: FetchOptions, retried = false): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new ApiError(401, "Not authenticated.");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 && !retried) {
    // Single-flight refresh, then exactly one retry.
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut();
      throw new ApiError(401, "Session expired. Please sign in again.");
    }
    return request(path, init, true);
  }

  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  return res;
}

/**
 * Tiny bearer helper for the Phase 0C Next.js boundaries. Sends the current
 * access token, refreshes once on 401 and retries once, then signs out.
 * Tokens are never logged and never surface to UI code.
 */
export async function apiFetch(path: string, init?: FetchOptions): Promise<Response> {
  return request(path, init, false);
}

export async function apiJson<T>(path: string, init?: FetchOptions): Promise<T> {
  const res = await request(path, init, false);
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) message = body.error;
    } catch {
      // Keep the generic message; never leak raw bodies.
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}
