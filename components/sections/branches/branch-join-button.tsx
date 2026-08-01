"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinBranch, leaveBranch } from "@/actions/branch.actions";

interface BranchJoinButtonProps {
  branchId: string;
  isMember: boolean;
  label: string;
  helperText?: string;
}

export function BranchJoinButton({
  branchId,
  isMember,
  label,
  helperText,
}: BranchJoinButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    setLoading(true);
    const result = await joinBranch(branchId);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    }
  }

  async function handleLeave() {
    setError(null);
    setLoading(true);
    const result = await leaveBranch();
    setLoading(false);

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
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Leave Branch
        </Button>
        {helperText && (
          <p className="mt-3 text-xs text-white/35">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="primary"
        onClick={handleJoin}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowUpRight size={16} />
        )}
        {label}
      </Button>
      {helperText && (
        <p className="mt-3 text-xs text-white/35">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
