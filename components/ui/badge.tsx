import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border-strong/[0.08] bg-surface px-4 py-1.5 text-xs font-medium tracking-wide text-ink-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
