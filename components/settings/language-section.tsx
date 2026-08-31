"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Globe, Languages, LoaderCircle, Search } from "lucide-react";
import { useTranslation } from "@/components/translation/translation-provider";
import { LANGUAGES } from "@/lib/translation/languages";
import { SettingsPanel, SaveIndicator, type SaveState } from "./settings-panel";
import { cn } from "@/lib/utils";

export function LanguageSection() {
  const { language, setLanguage, isTranslating } = useTranslation();
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  const activeLang = LANGUAGES.find((l) => l.code === language);

  function handleSelect(code: string) {
    setLanguage(code);
    setSaveState("saving");
    window.setTimeout(() => {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    }, 400);
  }

  return (
    <div className="space-y-4">
      <SettingsPanel>
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300">
              <Globe size={16} />
            </span>
            <div>
              <h3 className="text-sm font-medium text-ink-50">Language</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {activeLang ? (
                  <>
                    Current: <span data-no-translate translate="no" className="font-medium text-ink-200">{activeLang.flag} {activeLang.nativeLabel}</span> · Translation applies site-wide including courses
                  </>
                ) : (
                  "Choose your preferred language — it applies everywhere."
                )}
              </p>
            </div>
          </div>
          {isTranslating ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent/[0.08] px-2.5 py-1 text-xs font-medium text-accent-300">
              <LoaderCircle size={12} className="animate-spin" />
              Translating…
            </span>
          ) : (
            <SaveIndicator state={saveState} />
          )}
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-ink-50">
              <Languages size={14} className="text-accent-300" />
              Choose language
            </h4>
            <span className="text-xs text-ink-500">{LANGUAGES.length} languages</span>
          </div>

          <div className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages…"
              aria-label="Search languages"
              className="w-full rounded-xl border border-border bg-surface px-9 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/40 focus:ring-2 focus:ring-accent-400/20"
            />
          </div>

          <div data-no-translate translate="no" className="mt-4 grid gap-2 sm:grid-cols-2">
            {filtered.map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  aria-pressed={active}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                    active
                      ? "border-accent-400/50 bg-accent/[0.08] shadow-[0_0_24px_-10px_rgba(90,120,255,0.5)]"
                      : "border-border bg-surface hover:border-accent-400/20 hover:bg-surface-hover",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-base">
                    {lang.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-50">{lang.nativeLabel}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {lang.label} · {lang.code.toUpperCase()}
                    </span>
                  </span>
                  {active ? <CheckCircle2 size={16} className="shrink-0 text-accent-300" /> : null}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 text-center text-sm text-ink-500">No languages match “{query}”.</p>
          ) : null}

          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            Translation is automatic and covers the entire website including courses, labs and live sessions. Original English is restored instantly when you switch back to English.
          </p>
        </div>
      </SettingsPanel>
    </div>
  );
}
