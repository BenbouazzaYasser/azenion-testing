"use client";

/**
 * MVP "Translate this page" (EN -> FR) — intentionally lightweight.
 * NOT a replacement for the proper next-intl work; it only rewrites visible
 * text nodes in the already-rendered DOM and restores them on toggle-off.
 * Skips inputs, code, usernames/emails, numbers, and known product names.
 * Translations are cached in sessionStorage for the tab session.
 */
import { useEffect, useState } from "react";
import { Languages, LoaderCircle, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CACHE_KEY = "azenion-page-tx-fr";
const SOURCE_LANG = "en";
const TARGET_LANG = "fr";
const SKIP_SELECTOR =
  "script,style,noscript,pre,code,kbd,samp,textarea,input,select,[contenteditable],[data-no-translate],[translate='no']";
// Only translate nodes with enough alphabetic content to be worth it.
const WORTHY = /[A-Za-z]{2,}/;
const PRODUCT_NAMES = ["Azenion", "Zen", "Asteria", "Astral", "Nexion"];

type Cache = Record<string, string>;
const originals = new Map<Text, string>();
let cache: Cache = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "{}") as Cache;
  } catch {
    return {};
  }
})();

function protectNames(text: string): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  let out = text;
  PRODUCT_NAMES.forEach((name, i) => {
    const re = new RegExp(`\\b${name}\\b`, "g");
    if (re.test(out)) {
      out = out.replace(re, `[[P${i}]]`);
      tokens[i] = name;
    }
  });
  return { text: out, tokens };
}

function restoreNames(text: string, tokens: string[]): string {
  return text.replace(/\[\[P(\d+)\]\]/g, (_, i) => tokens[Number(i)] ?? "");
}

async function fetchTranslation(text: string): Promise<string | null> {
  const { text: prepared, tokens } = protectNames(text);
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(prepared)}` +
    `&langpair=${SOURCE_LANG}|${TARGET_LANG}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText;
    if (!translated) return null;
    return restoreNames(translated, tokens);
  } catch {
    return null;
  }
}

export function PageTranslator() {
  const [state, setState] = useState<"idle" | "working" | "translated">("idle");

  // If the proper next-intl locale is French, the page is already French.
  useEffect(() => {
    if (document.documentElement.lang === TARGET_LANG) setState("idle");
  }, []);

  function restoreAll() {
    originals.forEach((original, node) => {
      if (node.isConnected) node.nodeValue = original;
    });
    originals.clear();
  }

  async function translate() {
    setState("working");
    restoreAll(); // start fresh so repeated runs don't double-wrap

    const root = document.querySelector("main") ?? document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const pending: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const value = textNode.nodeValue ?? "";
      const el = textNode.parentElement;
      if (!value.trim() || !WORTHY.test(value)) continue;
      if (!el || el.closest(SKIP_SELECTOR)) continue;
      // Preserve emails / @handles / URLs / mostly-numeric strings.
      if (/^\W*$/.test(value) || /@[\w.-]+|https?:\/\//.test(value)) continue;
      pending.push(textNode);
    }

    const unique = [...new Set(pending.map((n) => n.nodeValue!.trim()))];
    const missing = unique.filter((text) => !(text in cache));

    const results = await Promise.all(
      missing.map(async (text) => [text, await fetchTranslation(text)] as const),
    );
    for (const [text, translated] of results) {
      if (translated && translated.trim()) cache[text] = translated;
    }
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {}

    let applied = 0;
    for (const textNode of pending) {
      const value = textNode.nodeValue!;
      const hit = cache[value.trim()];
      if (!hit) continue;
      originals.set(textNode, value);
      textNode.nodeValue = value.replace(value.trim(), hit);
      applied += 1;
    }
    setState(applied > 0 ? "translated" : "idle");
  }

  function toggle() {
    if (state === "working") return;
    if (state === "translated") {
      restoreAll();
      setState("idle");
      return;
    }
    void translate();
  }

  const label =
    state === "translated" ? "Voir en anglais" : "Traduire cette page";
  const title =
    state === "translated"
      ? "Restore the original English text"
      : "Translate this page to French (experimental)";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === "working"}
      aria-pressed={state === "translated"}
      title={title}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border navbar-element-border text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:pointer-events-none"
    >
      {state === "working" ? (
        <LoaderCircle size={18} className={cn("animate-spin")} />
      ) : state === "translated" ? (
        <Undo2 size={17} />
      ) : (
        <Languages size={18} />
      )}
    </button>
  );
}
