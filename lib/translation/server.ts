import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { lookup } from "@/lib/translation/dictionaries";
import { DEFAULT_LANGUAGE, isValidLanguage } from "@/lib/translation/languages";
import type { DictKey } from "@/lib/translation/types";

const LANG_COOKIE = "azenion-lang";

/**
 * Server-side translation lookup. Reads the user's chosen language from the
 * `azenion-lang` cookie and returns the hand-written translation for `key`,
 * falling back to English (the source language).
 */
export const getServerLanguage = cache(async (): Promise<string> => {
  try {
    const store = await cookies();
    const cookie = store.get(LANG_COOKIE)?.value;
    if (cookie && isValidLanguage(cookie)) return cookie;
  } catch {
    // cookies() can throw during static generation — fall through to default.
  }
  return DEFAULT_LANGUAGE;
});

export async function serverT(key: DictKey, fallback?: string): Promise<string> {
  return lookup(key, await getServerLanguage(), fallback) ?? fallback ?? key;
}