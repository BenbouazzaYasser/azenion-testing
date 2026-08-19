"use client";

import { useEffect, useState } from "react";
import { getOnboardingData } from "@/actions/onboarding.actions";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useAuth } from "@/components/auth/auth-provider";
import type { OnboardingData } from "@/lib/onboarding-data";

export function OnboardingProvider() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Skip the getOnboardingData server-action round-trip entirely for
    // logged-out visitors — it would only return null anyway (it starts
    // with supabase.auth.getUser()). Gating on `user`/`loading` avoids a
    // wasted network call + serverless invocation on every page load.
    if (!user || loading) return;
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
  }, [user, loading]);

  if (!data || !data.visible || done) return null;

  return <OnboardingModal data={data} onClosed={() => setDone(true)} />;
}