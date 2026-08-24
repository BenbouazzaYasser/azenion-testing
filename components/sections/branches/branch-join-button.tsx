"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinBranch, leaveBranch } from "@/actions/branch.actions";
import { useUser } from "@/hooks/use-user";

interface BranchJoinButtonProps {
  branchId: string;
  isMember: boolean;
  label: string;
  helperText?: string;
  /** Renders on dark cosmic backgrounds (branch detail hero). */
  cosmic?: boolean;
}

export function BranchJoinButton({
  branchId,
  isMember,
  label,
  helperText,
  cosmic = false,
}: BranchJoinButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redirectToSignIn() {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    toast.info("Sign in to join this branch.");
    router.push(`/login${next}`);
  }

  async function handleJoin() {
    setError(null);
    if (!loading && !user) {
      redirectToSignIn();
      return;
    }
    setIsLoading(true);
    const result = await joinBranch(branchId);
    setIsLoading(false);

    if (result?.error) {
      if (result.error === "Not authenticated") {
        redirectToSignIn();
        return;
      }
      setError(result.error);
      return;
    }

    // The platform auto-added the user to the branch's chat server.
    toast.success("You've been added to the branch server and its channels.");
  }

  async function handleLeave() {
    setError(null);
    setIsLoading(true);
    const result = await leaveBranch();
    setIsLoading(false);

    if (result?.error) {
      setError(result.error);
    }
  }

  if (isMember) {
    return (
      <div>
        <Button
          variant="secondary"
          onClick={handleLeave}
          disabled={isLoading}
          className={cosmic ? "branch-hero-cta" : undefined}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Leave Branch
        </Button>
        {helperText && (
          <p className={`mt-3 text-xs ${cosmic ? "branch-hero-helper" : "text-ink-600"}`}>{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="primary"
        onClick={handleJoin}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowUpRight size={16} />
        )}
        {label}
      </Button>
      <p className={`mt-3 text-xs ${cosmic ? "branch-hero-helper" : "text-ink-600"}`}>
        You&apos;ll be added to the branch server&apos;s channels automatically.
      </p>
      {helperText && (
        <p className={`mt-1 text-xs ${cosmic ? "branch-hero-helper" : "text-ink-600"}`}>{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
