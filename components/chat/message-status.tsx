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

export function MessageStatus({ status, className }: MessageStatusProps) {
  if (status === "seen") {
    return <CheckCheck className={cn("h-4 w-4 shrink-0", className)} />;
  }

  if (status === "received") {
    return <CheckCheck className={cn("h-3.5 w-3.5 shrink-0", className)} />;
  }

  return <Check className={cn("h-3.5 w-3.5 shrink-0", className)} />;
}
