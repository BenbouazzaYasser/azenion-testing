"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Globe, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { updateLanguage } from "@/actions/settings.actions";
import { SettingsPanel, SaveIndicator, type SaveState } from "./settings-panel";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "en" as const, labelKey: "english" as const },
  { value: "fr" as const, labelKey: "french" as const },
];

export function LanguageSection() {
  const t = useTranslations("settings.language");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Show progress while the server action runs…
  useEffect(() => {
    if (isPending) setSaveState("saving");
  }, [isPending]);

  // …then confirm once the active locale has changed (same UX as appearance).
  useEffect(() => {
    if (isPending) return;
    setSaveState("saved");
    const timer = window.setTimeout(() => setSaveState("idle"), 1600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function choose(next: "en" | "fr") {
    if (next === locale || isPending) return;
    startTransition(async () => {
      const result = await updateLanguage(next);
      if (!result || "error" in result) {
        setSaveState("idle");
        return;
      }
      // Re-render server components with the new locale cookie.
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = locale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              disabled={isPending}
              aria-pressed={active}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:cursor-not-allowed",
                active
                  ? "border-accent-400/50 bg-accent/[0.08] shadow-[0_0_24px_-10px_rgba(90,120,255,0.6)]"
                  : "border-border-strong/[0.08] bg-surface hover:border-border-strong/[0.16] hover:bg-surface-hover",
              )}
            >
              {active ? (
                <span className="absolute right-3 top-3 text-accent-300">
                  <CheckCircle2 size={16} />
                </span>
              ) : null}
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border",
                  active
                    ? "border-accent-400/40 bg-accent/[0.12] text-accent-200"
                    : "border-border-strong/[0.08] bg-surface text-ink-300",
                )}
              >
                {option.value === "en" ? <Languages size={18} /> : <Globe size={18} />}
              </span>
              <span className="mt-3 block text-sm font-medium text-ink-50">{t(option.labelKey)}</span>
              <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-500">{option.value}</span>
            </button>
          );
        })}
      </div>

      <SettingsPanel>
        <div className="flex items-center justify-between gap-3 p-5">
          <div>
            <h3 className="text-sm font-medium text-ink-50">{t("panelTitle")}</h3>
            <p className="mt-0.5 text-xs text-ink-500">{t("panelDescription")}</p>
          </div>
          <SaveIndicator state={saveState} />
        </div>
      </SettingsPanel>
    </div>
  );
}
