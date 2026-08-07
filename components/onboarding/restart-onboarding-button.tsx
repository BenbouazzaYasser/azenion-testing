"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restartOnboarding } from "@/actions/onboarding.actions";

export function RestartOnboardingButton() {
  const [pending, setPending] = useState(false);

  async function handleRestart() {
    if (pending) return;
    setPending(true);
    const result = await restartOnboarding();
    setPending(false);
    if (result && "error" in result && result.error) return;
    // Full reload so the onboarding provider picks up the fresh state.
    window.location.assign("/profile");
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleRestart} disabled={pending}>
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <RotateCcw size={14} />
      )}
      {pending ? "Restarting\u2026" : "Restart Onboarding"}
    </Button>
  );
}