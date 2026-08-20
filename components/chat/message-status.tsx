"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageStatusKind = "sent" | "received" | "seen";

interface MessageStatusProps {
  status: MessageStatusKind;
  avatarUrl: string | null;
  avatarName: string | null;
  ring?: boolean;
  className?: string;
}

export function MessageStatus({
  status,
  avatarUrl,
  avatarName,
  ring = true,
  className,
}: MessageStatusProps) {
  if (status === "seen") {
    return (
      <span
        className={cn(
          "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          className,
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className={cn(
              "h-full w-full rounded-full object-cover",
              ring && "ring-2 ring-void-950",
            )}
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-[7px] font-semibold leading-none text-white",
              ring && "ring-2 ring-void-950",
            )}
          >
            {avatarName?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </span>
    );
  }

  if (status === "received") {
    return <CheckCheck className={cn("h-3.5 w-3.5 shrink-0", className)} />;
  }

  return <Check className={cn("h-3.5 w-3.5 shrink-0", className)} />;
}