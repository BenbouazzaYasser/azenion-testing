"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface SettingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Accessible premium switch. Rendered as a role="switch" button with keyboard
 * support (Space/Enter toggle, ArrowLeft/ArrowRight set state) and a visible
 * focus ring.
 */
export function SettingToggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: SettingToggleProps) {
  const rawId = useId();
  const id = `toggle-${rawId.replace(/[:]/g, "")}`;

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = e.key === "ArrowRight";
      if (next !== checked) onChange(next);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium text-ink-200">
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-ink-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:cursor-not-allowed disabled:opacity-50 before:absolute before:-inset-2 before:rounded-full before:content-['']",
          checked
            ? "border-accent-400/60 bg-accent shadow-[0_0_16px_-4px_rgba(40,40,255,0.6)]"
            : "border-border-strong/[0.08] bg-surface",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-300 ease-premium",
            checked ? "left-[22px] bg-white" : "left-[3px] bg-ink-400",
          )}
        />
      </button>
    </div>
  );
}