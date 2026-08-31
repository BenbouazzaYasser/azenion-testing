"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Languages, LoaderCircle, Undo2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";
import { getLanguage } from "@/lib/translation/languages";

const QUICK_LANGS = ["fr", "es", "de", "ar", "zh", "ja"];

export function PageTranslator() {
  const { language, setLanguage, isTranslating, isTranslated } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const current = getLanguage(language);

  function handleRestore() {
    setLanguage("en");
    setOpen(false);
  }

  const title = isTranslated
    ? `Currently ${current?.nativeLabel ?? language} — restore English`
    : "Translate site";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (isTranslated) {
            handleRestore();
            return;
          }
          setOpen((v) => !v);
        }}
        disabled={isTranslating}
        aria-pressed={isTranslated}
        aria-expanded={open}
        aria-haspopup="menu"
        title={title}
        aria-label={title}
        className="flex h-11 w-11 items-center justify-center rounded-full border navbar-element-border text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:pointer-events-none"
      >
        {isTranslating ? (
          <LoaderCircle size={18} className={cn("animate-spin")} />
        ) : isTranslated ? (
          <Undo2 size={17} />
        ) : (
          <span className="relative flex items-center justify-center">
            <Languages size={18} />
            {language !== "en" ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold leading-none text-white">
                {language.toUpperCase().slice(0, 2)}
              </span>
            ) : null}
          </span>
        )}
      </button>

      {open && !isTranslated ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-glass shadow-dropdown backdrop-blur-2xl animate-dropdown-in">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/80 to-transparent"
          />
          <div className="px-3 pb-2 pt-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
              Quick translate
            </p>
            <div data-no-translate translate="no" className="grid grid-cols-2 gap-1.5">
              {QUICK_LANGS.map((code) => {
                const lang = getLanguage(code)!;
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      active
                        ? "border-accent-400/40 bg-accent/[0.08] text-ink-50"
                        : "border-border bg-surface text-ink-300 hover:bg-surface-hover hover:text-ink-50",
                    )}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    <span className="truncate">{lang.nativeLabel}</span>
                  </button>
                );
              })}
            </div>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent-400/20 bg-accent/[0.06] px-3 py-2 text-xs font-medium text-accent-300 transition-colors hover:bg-accent/[0.1]"
            >
              <Settings2 size={12} />
              All languages in Settings
            </Link>
            <p className="mt-2 px-1 text-center text-[10px] leading-relaxed text-ink-600">
              Covers the whole site including courses.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
