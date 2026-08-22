const FETCH_TIMEOUT_MS = 20_000;
const COOLDOWN_MS = 10_000;
const MAX_CONSECUTIVE_FAILURES = 2;
const MAX_RETRIES = 2;

let backendDown = false;
let retryAfter = 0;
let consecutiveFailures = 0;

function abortError(message: string): Error {
  const err = new Error(message);
  err.name = "AbortError";
  return err;
}

/** Transient network errors worth retrying once or twice. */
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPROTO",
  "EPIPE",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function isRetryable(error: unknown): boolean {
  const cause = (error as { cause?: unknown })?.cause;
  const code = (cause as { code?: string } | undefined)?.code;
  if (code) return RETRYABLE_CODES.has(code);
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(abortError(`Fetch timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Global fetch wrapper for Supabase clients.
 *
 * Two problems it solves when the Supabase backend is unreachable on the
 * current network (e.g. the project hostname doesn't resolve here):
 *
 *   1. Node's fetch can hang ~7s per call retrying DNS before failing, and
 *      postgrest-js retries any rejected fetch up to 3 extra times (~28s per
 *      query). A hard timeout caps each attempt at FETCH_TIMEOUT_MS and
 *      throws an AbortError — which postgrest-js does NOT retry.
 *   2. Transient network failures (resets, unreachable, DNS drops) are retried
 *      up to MAX_RETRIES times with a short backoff so a single blip does not
 *      fail a user-facing action. After repeated failures we trip a circuit
 *      breaker so every subsequent call fails instantly instead of paying the
 *      DNS retry again on each query. The breaker self-resets after COOLDOWN_MS.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (backendDown && Date.now() < retryAfter) {
    throw abortError("Supabase backend unreachable (cached)");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await delay(400 * attempt);
    }

    try {
      const response = await withTimeout(fetch(input, init), FETCH_TIMEOUT_MS);
      backendDown = false;
      consecutiveFailures = 0;
      return response;
    } catch (error) {
      lastError = error;
      consecutiveFailures += 1;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        backendDown = true;
        retryAfter = Date.now() + COOLDOWN_MS;
      }
      if (!isRetryable(error)) break;
    }
  }

  throw abortError(
    lastError instanceof Error ? lastError.message : "Supabase fetch failed",
  );
}
