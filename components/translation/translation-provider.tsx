"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LANGUAGE, getDirection, isValidLanguage } from "@/lib/translation/languages";

const STORAGE_KEY = "azenion-lang";
const COOKIE_KEY = "azenion-lang";
const SOURCE_LANG = "en";

const SKIP_SELECTOR =
  "script,style,noscript,pre,code,kbd,samp,textarea,input,select,[contenteditable],[data-no-translate],[translate='no']";
const WORTHY = /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]{2,}/;

interface TranslationContextValue {
  language: string;
  setLanguage: (code: string) => void;
  isTranslating: boolean;
  isTranslated: boolean;
  restore: () => void;
}

const TranslationContext = createContext<TranslationContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  isTranslating: false,
  isTranslated: false,
  restore: () => {},
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
  
  // Detect browser language
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator) {
    const nav = navigator as { language?: unknown; languages?: readonly unknown[] };
    const langStr = typeof nav.language === "string" ? nav.language : (Array.isArray(nav.languages) && typeof nav.languages[0] === "string" ? nav.languages[0] : null);
    if (langStr && typeof langStr === "string") {
      const parts = langStr.split("-");
      const primary = parts[0];
      if (primary && typeof primary === "string") {
        const browserLang = primary.toLowerCase();
        if (isValidLanguage(browserLang)) return browserLang;
      }
    }
  }

  const htmlLang = document.documentElement.lang;
  if (htmlLang && isValidLanguage(htmlLang)) return htmlLang;
  return DEFAULT_LANGUAGE;
}

function applyDirection(code: string) {
  const dir = getDirection(code);
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
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

function collectTextNodes(root: Element): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pending: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const value = textNode.nodeValue ?? "";
    if (!value.trim() || !WORTHY.test(value)) continue;
    const el = textNode.parentElement;
    if (!el || el.closest(SKIP_SELECTOR)) continue;
    if (/^\W*$/.test(value) || /@[\w.-]+|https?:\/\//.test(value)) continue;
    // Skip nodes already replaced (have original stored)
    if ((textNode as unknown as { __azenion_original?: string }).__azenion_original !== undefined) continue;
    pending.push(textNode);
  }
  return pending;
}

function cacheKey(target: string) {
  return `azenion-tx-v6-${target}`;
}

function loadCache(target: string): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(cacheKey(target)) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveCache(target: string, map: Record<string, string>) {
  try {
    sessionStorage.setItem(cacheKey(target), JSON.stringify(map));
  } catch {}
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

  const [isTranslating, setIsTranslating] = useState(false);
  const originalsRef = useRef<Map<Text, string>>(new Map());
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const translatingRef = useRef(false);
  const pendingTranslateRef = useRef<(() => void) | null>(null);

  const restore = useCallback(() => {
    originalsRef.current.forEach((original, node) => {
      if (node.isConnected) {
        const anyNode = node as unknown as Record<string, unknown>;
        if (anyNode.__azenion_original !== undefined) delete anyNode.__azenion_original;
        node.nodeValue = original;
      }
    });
    originalsRef.current.clear();
    mutationObserverRef.current?.disconnect();
    mutationObserverRef.current = null;
  }, []);

  const translateNodes = useCallback(
    async (nodes: Text[], target: string) => {
      if (target === SOURCE_LANG || nodes.length === 0) return;
      if (translatingRef.current) {
        // queue a re-run after current batch
        pendingTranslateRef.current = () => void translateNodes(collectTextNodes(document.body), target);
        return;
      }
      translatingRef.current = true;
      setIsTranslating(true);

      const unique = [...new Set(nodes.map((n) => n.nodeValue!.trim()))];
      const cache = loadCache(target);
      const missing = unique.filter((t) => !(t in cache));

      if (missing.length > 0) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ texts: missing, source: SOURCE_LANG, target }),
          });
          if (res.ok) {
            const data = (await res.json()) as { translations?: Record<string, string> };
            const translations = data.translations ?? {};
            Object.assign(cache, translations);
            saveCache(target, cache);
          }
        } catch {
          // ignore network errors
        }
      }

      let applied = 0;
      for (const node of nodes) {
        const value = node.nodeValue!;
        const trimmed = value.trim();
        const hit = cache[trimmed];
        if (!hit) continue;
        (node as unknown as Record<string, unknown>).__azenion_original = value;
        originalsRef.current.set(node, value);
        node.nodeValue = value.replace(trimmed, hit);
        applied += 1;
      }

      // Keep observer active to translate dynamically added nodes (e.g. courses filtering)
      void applied;
      translatingRef.current = false;
      setIsTranslating(false);
      if (pendingTranslateRef.current) {
        const fn = pendingTranslateRef.current;
        pendingTranslateRef.current = null;
        fn();
      }
    },
    [],
  );

  const runTranslation = useCallback(
    async (target: string) => {
      restore();
      if (target === SOURCE_LANG) return;
      const root = document.body;
      if (!root) return;
      
      // Instantly gather all text nodes on the page and translate them in one batch before rendering/revealing
      setIsTranslating(true);
      const nodes = collectTextNodes(root);
      await translateNodes(nodes, target);

      // Observe future mutations while translated (whole body so navbar + courses + any route change is caught)
      if (target !== SOURCE_LANG) {
        const observer = new MutationObserver((mutations) => {
          const addedNodes: Text[] = [];
          for (const m of mutations) {
            for (const n of Array.from(m.addedNodes)) {
              if (n.nodeType === Node.TEXT_NODE) {
                const tn = n as Text;
                const v = tn.nodeValue ?? "";
                if (v.trim() && WORTHY.test(v) && !tn.parentElement?.closest(SKIP_SELECTOR)) addedNodes.push(tn);
              } else if (n.nodeType === Node.ELEMENT_NODE) {
                const el = n as Element;
                if (el.matches?.(SKIP_SELECTOR) || el.closest?.(SKIP_SELECTOR)) continue;
                addedNodes.push(...collectTextNodes(el));
              }
            }
            if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
              const tn = m.target as Text;
              const v = tn.nodeValue ?? "";
              if (v.trim() && WORTHY.test(v) && !(tn as unknown as { __azenion_original?: string }).__azenion_original) {
                const el = tn.parentElement;
                if (el && !el.closest(SKIP_SELECTOR)) addedNodes.push(tn);
              }
            }
          }
          if (addedNodes.length > 0) void translateNodes(addedNodes, target);
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true });
        mutationObserverRef.current = observer;
      }
    },
    [restore, translateNodes],
  );

  // Sync language to DOM + storage (includes rtl dir for Arabic/Hebrew/Fa/Ur)
  useEffect(() => {
    applyDirection(language);
    persistLanguage(language);
  }, [language]);

  const pathname = usePathname();

  // Initial + subsequent translations
  useEffect(() => {
    // Defer to next tick so initial paint completes (avoid blocking hydration)
    const t = window.setTimeout(() => void runTranslation(language), language === SOURCE_LANG ? 0 : 120);
    return () => window.clearTimeout(t);
  }, [language, runTranslation]);

  // When the route changes, do not trigger incremental loading. 
  // All translations are pre-cached and applied instantly on route change.
  useEffect(() => {
    if (language === SOURCE_LANG) return;
    const root = document.body;
    const nodes = collectTextNodes(root);
    if (nodes.length) {
      // Apply silently from cache without showing loading overlay
      const target = language;
      const cache = loadCache(target);
      for (const node of nodes) {
        const value = node.nodeValue!;
        const trimmed = value.trim();
        const hit = cache[trimmed];
        if (!hit) continue;
        (node as unknown as Record<string, unknown>).__azenion_original = value;
        originalsRef.current.set(node, value);
        node.nodeValue = value.replace(trimmed, hit);
      }
    }
  }, [pathname, language]);

  const setLanguage = useCallback((code: string) => {
    if (!isValidLanguage(code)) return;
    setLanguageState(code);
    persistLanguage(code);
  }, []);

  const isTranslated = language !== SOURCE_LANG;

  // Keep initialLanguage prop in sync if server provided a fresher value (e.g. after login)
  useEffect(() => {
    if (initialLanguage && isValidLanguage(initialLanguage) && initialLanguage !== language) {
      // Only override if user hasn't already chosen a local preference? We prefer server if it's not default.
      // Simple rule: if server has non-default and local is default, adopt server.
      const stored = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      if (!stored || stored === DEFAULT_LANGUAGE) {
        setLanguageState(initialLanguage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLanguage]);

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        isTranslating,
        isTranslated,
        restore: () => {
          restore();
          setLanguageState(SOURCE_LANG);
          persistLanguage(SOURCE_LANG);
        },
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}
