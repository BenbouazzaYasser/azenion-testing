"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

/**
 * Premium glass panel used for every settings card. The top gradient hairline
 * echoes the navbar/dropdown treatment for a consistent brand feel.
 */
export function SettingsPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-glass-panel shadow-card backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/70 to-transparent"
      />
      {children}
    </div>
  );
}

/** Small live status pill for save actions. */
export function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 size={12} />
        {t("settings.saved")}
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent/[0.08] px-2.5 py-1 text-xs font-medium text-accent-300">
        <LoaderCircle size={12} className="animate-spin" />
        {t("settings.saving")}
      </span>
    );
  }
  if (state === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
        {t("settings.unsaved")}
      </span>
    );
  }
  return null;
}