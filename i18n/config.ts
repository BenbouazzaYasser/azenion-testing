export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Resolves the best supported locale from an Accept-Language header.
 * Only the primary subtag matters for this app ("fr-CA" matches "fr").
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";").map((s) => s.trim());
      let quality = 1;
      for (const param of params) {
        const match = /^q=([\d.]+)$/.exec(param);
        if (match) quality = parseFloat(match[1] ?? "1");
      }
      return { tag: tag?.toLowerCase() ?? "", quality };
    })
    .filter((part) => part.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  // First pass: exact supported tag ("fr", "en").
  for (const { tag } of parts) {
    if (isLocale(tag)) return tag;
  }
  // Second pass: regional variants ("fr-ca", "en-gb", ...).
  for (const { tag } of parts) {
    const primary = tag.split("-")[0] ?? "";
    if (isLocale(primary)) return primary;
  }
  return defaultLocale;
}
