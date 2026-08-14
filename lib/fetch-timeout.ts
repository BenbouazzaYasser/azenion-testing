const FETCH_TIMEOUT_MS = 5000;
const FETCH_UPLOAD_TIMEOUT_MS = 300_000;
const COOLDOWN_MS = 15_000;

let backendDown = false;
let retryAfter = 0;

/**
 * Large file uploads (e.g. videos) legitimately take longer than the 5s
 * general request cap. Only storage object POST/PUT requests get the longer
 * window; every other call keeps the fast-fail timeout.
 */
function isStorageUpload(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (
    init?.method ??
    (input instanceof Request ? input.method : undefined) ??
    "GET"
  ).toUpperCase();
  if (method !== "POST" && method !== "PUT") return false;
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  return url.pathname.startsWith("/storage/");
}

function abortError(message: string): Error {
  const err = new Error(message);
  err.name = "AbortError";
  return err;
}

/**
 * Global fetch wrapper for Supabase clients.
 *
 * Two problems it solves when the Supabase backend is unreachable on the
 * current network (e.g. the project hostname doesn't resolve here):
 *
 *   1. Node's fetch can hang ~7s per call retrying DNS before failing, and
 *      postgrest-js retries any rejected fetch up to 3 extra times (~28s per
 *      query). A hard timeout caps the first attempt at FETCH_TIMEOUT_MS and
 *      throws an AbortError — which postgrest-js does NOT retry.
 *   2. After one failure we trip a circuit breaker so every subsequent call
 *      fails instantly instead of paying the DNS retry again on each query.
 *
 * The breaker self-resets after COOLDOWN_MS so a recovered backend is picked
 * up automatically.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (backendDown && Date.now() < retryAfter) {
    return Promise.reject(abortError("Supabase backend unreachable (cached)"));
  }

  const upload = isStorageUpload(input, init);
  const timeoutMs = upload ? FETCH_UPLOAD_TIMEOUT_MS : FETCH_TIMEOUT_MS;

  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!upload) {
        backendDown = true;
        retryAfter = Date.now() + COOLDOWN_MS;
      }
      reject(abortError(`Fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fetch(input, init).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        backendDown = true;
        retryAfter = Date.now() + COOLDOWN_MS;
        reject(
          abortError(
            error instanceof Error ? error.message : "Supabase fetch failed",
          ),
        );
      },
    );
  });
}