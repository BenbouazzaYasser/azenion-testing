"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
      const result = await deleteLiveSession(fd);
      setConfirming(false);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Session deleted");
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
          ? "flex h-9 items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          : "flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      }
    >
      <Trash2 size={13} />
      {confirming ? "Confirm?" : null}
    </button>
  );
}
