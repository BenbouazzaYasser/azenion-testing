import { en } from "@/lib/translation/dictionaries/en";
import type { TranslationResource } from "@/lib/translation/types";

export const SOURCE_LANG = "en";

const base: Record<string, TranslationResource> = {
  en,
};

export async function loadDictionary(
  lang: string,
): Promise<TranslationResource | undefined> {
  if (base[lang]) return base[lang];
  switch (lang) {
    case "fr":
      return (await import("@/lib/translation/dictionaries/fr")).fr;
    case "ar":
      return (await import("@/lib/translation/dictionaries/ar")).ar;
    default:
      return undefined;
  }
}

/**
 * Synchronous lookup against the eagerly-loaded dictionaries only. For a
 * non-English language that hasn't been streamed yet this falls back to the
 * English source value — merge `loaded` dictionaries in the caller first.
 */
export function lookupBase(
  key: string,
  lang: string,
  fallback?: string,
): string | undefined {
  const dict = base[lang];
  const exact = dict?.[key as keyof TranslationResource];
  if (exact !== undefined) return exact;
  if (lang !== SOURCE_LANG) {
    const source = base[SOURCE_LANG]?.[key as keyof TranslationResource];
    if (source !== undefined) return source;
  }
  return fallback;
}