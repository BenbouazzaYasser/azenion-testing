"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LANGUAGE,
  getDirection,
  isValidLanguage,
} from "@/lib/translation/languages";
import { lookup } from "@/lib/translation/dictionaries";
import type { DictKey } from "@/lib/translation/types";

const STORAGE_KEY = "azenion-lang";
const COOKIE_KEY = "azenion-lang";
const SOURCE_LANG = "en";

interface TranslationContextValue {
  language: string;
  setLanguage: (code: string) => void;
  isTranslating: boolean;
  isTranslated: boolean;
  restore: () => void;
  /** Look up a hand-written translation for the current language. Falls back to English. */
  t: (key: DictKey, fallback?: string) => string;
}

const TranslationContext = createContext<TranslationContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  isTranslating: false,
  isTranslated: false,
  restore: () => {},
  t: (key, fallback) => lookup(key, DEFAULT_LANGUAGE, fallback) ?? fallback ?? key,
});

export function useTranslation() {
  return useContext(TranslationContext);
}

function getStoredLanguage(): string {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && isValidLanguage(ls)) return ls;
  } catch {}
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    const c = m?.[1] ? decodeURIComponent(m[1]) : null;
    if (c && isValidLanguage(c)) return c;
  } catch {}
  return DEFAULT_LANGUAGE;
}

function applyDirection(code: string) {
  document.documentElement.lang = code;
  document.documentElement.dir = getDirection(code);
}

function persistLanguage(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
  applyDirection(code);
  // best-effort server sync (authenticated users)
  void import("@/actions/settings.actions").then(({ updateSettings }) =>
    updateSettings({ language: code }).catch(() => {}),
  );
}

export function TranslationProvider({
  initialLanguage,
  children,
}: {
  initialLanguage?: string;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<string>(() => {
    if (initialLanguage && isValidLanguage(initialLanguage)) return initialLanguage;
    if (typeof window !== "undefined") {
      try {
        return getStoredLanguage();
      } catch {
        return DEFAULT_LANGUAGE;
      }
    }
    return DEFAULT_LANGUAGE;
  });

  // Azenion ships hand-written translations — no network / machine translation,
  // so the provider is never "translating". `isTranslating` is kept for
  // backwards compatibility and is always false.
  const isTranslating = false;
  const isTranslated = language !== SOURCE_LANG;

  // If the server returned a fresher language (e.g. after login) and the user
  // has no local preference yet, adopt it.
  const [prevInitialLanguage, setPrevInitialLanguage] = useState(initialLanguage);
  if (prevInitialLanguage !== initialLanguage) {
    setPrevInitialLanguage(initialLanguage);
    if (initialLanguage && isValidLanguage(initialLanguage) && initialLanguage !== language) {
      const stored = (() => {
        if (typeof window === "undefined") return null;
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      if (!stored || stored === DEFAULT_LANGUAGE) setLanguageState(initialLanguage);
    }
  }

  const t = useCallback(
    (key: DictKey, fallback?: string) => lookup(key, language, fallback) ?? fallback ?? key,
    [language],
  );

  // Sync language to DOM + storage (includes rtl dir for Arabic).
  useEffect(() => {
    applyDirection(language);
    persistLanguage(language);
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    if (!isValidLanguage(code)) return;
    setLanguageState(code);
    persistLanguage(code);
  }, []);

  const restore = useCallback(() => {
    setLanguageState(SOURCE_LANG);
    persistLanguage(SOURCE_LANG);
  }, []);

  return (
    <TranslationContext.Provider
      value={{ language, setLanguage, isTranslating, isTranslated, restore, t }}
    >
      {children}
    </TranslationContext.Provider>
  );
}