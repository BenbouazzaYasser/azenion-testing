import "server-only";
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
export function getServerLanguage(): string {
  try {
    const cookie = cookies().get(LANG_COOKIE)?.value;
    if (cookie && isValidLanguage(cookie)) return cookie;
  } catch {
    // cookies() can throw during static generation — fall through to default.
  }
  return DEFAULT_LANGUAGE;
}

export function serverT(key: DictKey, fallback?: string): string {
  return lookup(key, getServerLanguage(), fallback) ?? fallback ?? key;
}