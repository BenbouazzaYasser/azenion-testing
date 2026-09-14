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
    getOnboardingData()
      .then((result) => {
        if (!active) return;
        if (result && result.visible) setData(result);
      })
      .catch(() => {
        /* best effort — onboarding is non-blocking */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!data || !data.visible || done) return null;

  return <OnboardingModal data={data} onClosed={() => setDone(true)} />;
}