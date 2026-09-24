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
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] font-semibold tracking-normal text-ink-200 shadow-control",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
