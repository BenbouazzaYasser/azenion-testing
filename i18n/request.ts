import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "./config";

type Messages = typeof en;

const DICTIONARIES: Record<Locale, Messages> = { en, fr };

/**
 * Recursively overlays `override` on top of `base`. Used so that a missing
 * key in the French dictionary transparently falls back to English instead
 * of surfacing an error or a raw key path in the UI.
 */
function deepMerge(base: unknown, override: unknown): unknown {
  if (
    base !== null &&
    override !== null &&
    typeof base === "object" &&
    typeof override === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(override)
  ) {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
      const parent = (base as Record<string, unknown>)[key];
      result[key] = key in (base as Record<string, unknown>) ? deepMerge(parent, value) : value;
    }
    return result;
  }
  return override ?? base;
}

export default getRequestConfig(async () => {
  // 1. Explicit choice / persisted preference (cookie seeded by middleware,
  //    server actions, and the login flow). Never overridden by detection.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  // 2. First visit: detect from the browser/device language. Middleware
  //    mirrors this into the cookie right after the first render.
  if (!isLocale(cookieLocale)) {
    const headerList = await headers();
    locale = localeFromAcceptLanguage(headerList.get("accept-language"));
  }

  return {
    locale,
    // English acts as the fallback layer for any missing translation.
    messages: deepMerge(DICTIONARIES[defaultLocale], DICTIONARIES[locale]) as Messages,
  };
});
