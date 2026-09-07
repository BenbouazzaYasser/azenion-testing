import type { TranslationResource } from "../types";
import { en } from "./en";
import { fr } from "./fr";
import { ar } from "./ar";

/** Curated, hand-written dictionaries for each shipped language. */
export const dictionaries: Record<string, TranslationResource> = {
  en,
  fr,
  ar,
};

export const SOURCE_LANG = "en";

/**
 * Look up a hand-written translation for `key` in the given language.
 * Falls back to English (the source language), never to machine translation.
 */
export function lookup(key: string, lang: string, fallback?: string): string | undefined {
  const dict = dictionaries[lang];
  const exact = dict?.[key as keyof TranslationResource];
  // An explicitly empty string is a legitimate value (e.g. a headline
  // segment intentionally left blank) — only fall back when the key is
  // actually missing.
  if (exact !== undefined) return exact;
  if (lang !== SOURCE_LANG) {
    const source = dictionaries[SOURCE_LANG]?.[key as keyof TranslationResource];
    if (source !== undefined) return source;
  }
  return fallback;
}