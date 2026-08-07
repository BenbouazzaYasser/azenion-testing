"use client";

import { useEffect, useState } from "react";
import { getOnboardingData } from "@/actions/onboarding.actions";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import type { OnboardingData } from "@/lib/onboarding-data";

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