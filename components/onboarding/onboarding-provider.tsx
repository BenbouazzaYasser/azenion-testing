"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getOnboardingData } from "@/actions/onboarding.actions";
import type { OnboardingData } from "@/lib/onboarding-data";

// Deferred: the 700+ line modal is only needed when onboarding is visible.
const OnboardingModal = dynamic(
  () =>
    import("@/components/onboarding/onboarding-modal").then((mod) => ({
      default: mod.OnboardingModal,
    })),
  { ssr: false, loading: () => null },
);

export function OnboardingProvider() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    if (typeof document !== "undefined" && !/(?:^|;\s*)sb-[^;]*-auth-token=/.test(document.cookie)) {
      return;
    }
    const load = () => {
      getOnboardingData()
        .then((result) => {
          if (!active) return;
          if (result && result.visible) setData(result);
        })
        .catch(() => { /* best effort — onboarding is non-blocking */ });
    };
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(load, { timeout: 4000 });
    } else {
      timeoutId = setTimeout(load, 1200);
    }
    return () => {
      active = false;
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  if (!data || !data.visible || done) return null;

  return <OnboardingModal data={data} onClosed={() => setDone(true)} />;
}