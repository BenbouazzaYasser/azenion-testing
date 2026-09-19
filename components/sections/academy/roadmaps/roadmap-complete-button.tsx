"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { markRoadmapNodeComplete } from "@/actions/roadmaps.actions";

interface RoadmapCompleteButtonProps {
  nodeId: string;
  slug: string;
}

/**
 * "Mark complete" control shown on the current step of a roadmap for signed-in
 * learners. Calls the server-authoritative RPC (auth.uid()-pinned, idempotent)
 * and refreshes the page so catalog-derived statuses advance to the next
 * "current" step.
 */
export function RoadmapCompleteButton({
  nodeId,
  slug,
}: RoadmapCompleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await markRoadmapNodeComplete(nodeId, slug, true);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <span className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Mark this step as complete"
      >
        <Check size={13} aria-hidden />
        {pending ? "Marking complete…" : "Mark complete"}
      </button>
      {error ? (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}