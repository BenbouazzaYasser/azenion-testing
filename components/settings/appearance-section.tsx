"use client";

import { useEffect, useState } from "react";
import { Monitor, SunMedium, Moon, CheckCircle2 } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { SettingsPanel, SaveIndicator, type SaveState } from "./settings-panel";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";

const OPTIONS: { value: Theme; labelKey: DictKey; descriptionKey: DictKey; icon: typeof Monitor }[] = [
  { value: "system", labelKey: "settings.appearanceSystem", descriptionKey: "settings.appearanceSystemDesc", icon: Monitor },
  { value: "light", labelKey: "settings.appearanceLight", descriptionKey: "settings.appearanceLightDesc", icon: SunMedium },
  { value: "dark", labelKey: "settings.appearanceDark", descriptionKey: "settings.appearanceDarkDesc", icon: Moon },
];

export function AppearanceSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    setSaveState("saved");
    const t = window.setTimeout(() => setSaveState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [theme]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
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
                <option.icon size={18} />
              </span>
              <span className="mt-3 block text-sm font-medium text-ink-50">{t(option.labelKey)}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{t(option.descriptionKey)}</span>
            </button>
          );
        })}
      </div>

      <SettingsPanel>
        <div className="flex items-center justify-between gap-3 p-5">
          <div>
            <h3 className="text-sm font-medium text-ink-50">{t("settings.sectionAppearance")}</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              {t("settings.appearanceDesc")}
            </p>
          </div>
          <SaveIndicator state={saveState} />
        </div>
      </SettingsPanel>
    </div>
  );
}