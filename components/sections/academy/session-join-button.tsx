"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Plus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/translation/translation-provider";
import { joinLiveSession, leaveLiveSession } from "@/actions/live-session.actions";

interface SessionJoinButtonProps {
  sessionId: string;
  isJoined: boolean;
  isFull: boolean;
  isEnded: boolean;
  isLive: boolean;
  className?: string;
}

export function SessionJoinButton({
  sessionId,
  isJoined,
  isFull,
  isEnded,
  isLive,
  className,
}: SessionJoinButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    setLoading(true);
    const result = await joinLiveSession(sessionId);
    setLoading(false);

    if (result?.error) {
      if (result.error === "Not authenticated") {
        router.push("/login");
        return;
      }
      setError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleLeave() {
    setError(null);
    setLoading(true);
    const result = await leaveLiveSession(sessionId);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  if (isEnded) {
    return (
      <div>
        <Button variant="secondary" disabled className={className}>
          {t("academy.recordingSoon")}
        </Button>
      </div>
    );
  }

  if (isJoined) {
    return (
      <div>
        <Button variant="secondary" onClick={handleLeave} disabled={loading} className={className}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {t("academy.leaveSession")}
        </Button>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }

  if (isFull) {
    return (
      <div>
        <Button variant="secondary" disabled className={className}>
          <Users size={14} />
          {t("academy.sessionFull")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="primary" onClick={handleJoin} disabled={loading} className={className}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {isLive ? t("academy.joinLive") : t("academy.joinSession")}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
