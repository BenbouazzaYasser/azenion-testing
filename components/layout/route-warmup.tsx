"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// High-value routes likely visited after landing. Prefetched once, after the
// browser is idle (post first paint), so first render is never blocked.
// Next.js prefetches dynamic routes as their shell + loading boundary — page
// data is NOT fetched, so no private/user data is warmed or cached.
const WARMUP_ROUTES = ["/feed", "/community", "/academy", "/teams"];

export function RouteWarmup() {
  const pathname = usePathname();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    const run = () => {
      if (done.current || typeof document !== "undefined" && document.hidden) return;
      done.current = true;
      for (const href of WARMUP_ROUTES) {
        if (href !== pathname) router.prefetch(href);
      }
    };

    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(run, { timeout: 3000 })
        : undefined;
    const timer = setTimeout(run, 2500);

    return () => {
      if (idle !== undefined) cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, [pathname, router]);

  return null;
}