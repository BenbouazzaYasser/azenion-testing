"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LANGUAGE,
  getDirection,
  isValidLanguage,
} from "@/lib/translation/languages";
import {
  SOURCE_LANG,
  loadDictionary,
  lookupBase,
} from "@/lib/translation/client-dictionaries";
import type { DictKey, TranslationResource } from "@/lib/translation/types";

const STORAGE_KEY = "azenion-lang";
const COOKIE_KEY = "azenion-lang";

interface TranslationContextValue {
  language: string;
  setLanguage: (code: string) => void;
  isTranslating: boolean;
  isTranslated: boolean;
  restore: () => void;
  t: (key: DictKey, fallback?: string) => string;
}

const TranslationContext = createContext<TranslationContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  isTranslating: false,
  isTranslated: false,
  restore: () => {},
  t: (key, fallback) => lookupBase(key, DEFAULT_LANGUAGE, fallback) ?? fallback ?? key,
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

function hasSessionCookie() {
  try {
    return /(?:^|;\s*)sb-[^;]*-auth-token=/.test(document.cookie);
  } catch {
    return false;
  }
}

function persistLanguageLocal(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
  applyDirection(code);
}

function syncLanguageToServer(code: string) {
  if (!hasSessionCookie()) return;
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

  const isTranslating = false;
  const isTranslated = language !== SOURCE_LANG;

  const [loaded, setLoaded] = useState<
    Partial<Record<string, TranslationResource>>
  >({});
  const loadingRef = useRef<Set<string>>(new Set());

  const t = useCallback(
    (key: DictKey, fallback?: string) => {
      const dict = loaded[language];
      const exact = dict?.[key as keyof TranslationResource];
      if (exact !== undefined) return exact;
      return lookupBase(key, language, fallback) ?? fallback ?? key;
    },
    [loaded, language],
  );

  const setLanguage = useCallback(
    (code: string) => {
      if (!isValidLanguage(code) || code === language) return;
      setLanguageState(code);
      persistLanguageLocal(code);
      syncLanguageToServer(code);
    },
    [language],
  );

  useEffect(() => {
    if (initialLanguage && isValidLanguage(initialLanguage) && initialLanguage !== language) {
      const stored = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      if (!stored || stored === DEFAULT_LANGUAGE) {
        setLanguageState(initialLanguage);
        persistLanguageLocal(initialLanguage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLanguage]);

  useEffect(() => {
    if (language === SOURCE_LANG || loadingRef.current.has(language)) return;
    loadingRef.current.add(language);
    loadDictionary(language)
      .then((dict) => {
        if (dict) {
          setLoaded((prev) =>
            prev[language] ? prev : { ...prev, [language]: dict },
          );
        }
      })
      .catch(() => {
        loadingRef.current.delete(language);
      });
  }, [language]);

  const restore = useCallback(() => {
    setLanguageState((prev) => {
      if (prev !== SOURCE_LANG) {
        persistLanguageLocal(SOURCE_LANG);
        syncLanguageToServer(SOURCE_LANG);
      }
      return SOURCE_LANG;
    });
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, isTranslating, isTranslated, restore, t }),
    // isTranslating/isTranslated are derived from language (already in deps)
    // and setLanguage/restore are stable after their deps settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, setLanguage, restore, t],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}
