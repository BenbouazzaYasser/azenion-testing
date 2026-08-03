"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteLiveSession } from "@/actions/live-session.actions";

interface DeleteSessionButtonProps {
  id: string;
}

export function DeleteSessionButton({ id }: DeleteSessionButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteLiveSession(fd);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={confirming ? "Confirm delete session" : "Delete session"}
      className={
        confirming
          ? "flex h-8 items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/25"
          : "flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors hover:border-red-500/40 hover:text-red-400"
      }
    >
      <Trash2 size={13} />
      {confirming ? "Confirm?" : null}
    </button>
  );
}
