export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

/**
 * Supported UI languages. The platform ships hand-written, curated
 * translations for these three languages only — no automatic machine
 * translation.
 */
export const LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
];

export const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

export function isValidLanguage(code: string): boolean {
  return LANGUAGE_CODES.has(code);
}

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export const DEFAULT_LANGUAGE = "en";

// "ar" is RTL and needs `dir="rtl"` on <html> for proper bidi + layout mirroring.
export const RTL_LANGUAGES = new Set(["ar"]);

export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGES.has(code);
}

export function getDirection(code: string): "rtl" | "ltr" {
  return isRtlLanguage(code) ? "rtl" : "ltr";
}