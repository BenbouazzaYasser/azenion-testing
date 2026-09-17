/**
 * Request-level instrumentation for Supabase traffic. Active only when
 * SUPABASE_INSTRUMENT=1 — otherwise this module costs one boolean check and
 * the wrapper below is never installed.
 *
 * Logs one line per completed call:
 *   [sb] start=+<ms since boot> dur=<ms> <method> <path>?<search> -> <status>
 * Start offsets + durations let a parser reconstruct which calls ran
 * sequentially vs concurrently within a render.
 */

let boot = 0;

export function shouldInstrument(): boolean {
  return process.env.SUPABASE_INSTRUMENT === "1";
}

export function instrumentSupabaseFetch(
  base: typeof fetch,
  tag: string,
): typeof fetch {
  if (boot === 0) boot = Date.now();
  return async (input, init) => {
    const start = Date.now();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    let path = url;
    try {
      const parsed = new URL(url);
      path = parsed.pathname + (parsed.search ? parsed.search.slice(0, 120) : "");
    } catch {
      // keep raw
    }
    const method = init?.method ?? "GET";
    try {
      const res = await base(input, init);
      if (process.env.SUPABASE_INSTRUMENT === "1") {
        console.error(
          `[sb:${tag}] start=+${start - boot} dur=${Date.now() - start} ${method} ${path} -> ${res.status}`,
        );
      }
      return res;
    } catch (err) {
      if (process.env.SUPABASE_INSTRUMENT === "1") {
        console.error(
          `[sb:${tag}] start=+${start - boot} dur=${Date.now() - start} ${method} ${path} -> ERR ${(err as Error)?.message?.slice(0, 80)}`,
        );
      }
      throw err;
    }
  };
}
