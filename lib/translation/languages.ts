export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська", flag: "🇺🇦" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית", flag: "🇮🇱" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", flag: "🇧🇩" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", flag: "🇰🇷" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", flag: "🇹🇭" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Danish", nativeLabel: "Dansk", flag: "🇩🇰" },
  { code: "no", label: "Norwegian", nativeLabel: "Norsk", flag: "🇳🇴" },
  { code: "fi", label: "Finnish", nativeLabel: "Suomi", flag: "🇫🇮" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština", flag: "🇨🇿" },
  { code: "ro", label: "Romanian", nativeLabel: "Română", flag: "🇷🇴" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar", flag: "🇭🇺" },
  { code: "sk", label: "Slovak", nativeLabel: "Slovenčina", flag: "🇸🇰" },
  { code: "bg", label: "Bulgarian", nativeLabel: "Български", flag: "🇧🇬" },
  { code: "hr", label: "Croatian", nativeLabel: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", label: "Serbian", nativeLabel: "Српски", flag: "🇷🇸" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی", flag: "🇮🇷" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", flag: "🇵🇰" },
];

export const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

export function isValidLanguage(code: string): boolean {
  return LANGUAGE_CODES.has(code);
}

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export const DEFAULT_LANGUAGE = "en";

// RTL languages need `dir="rtl"` on <html> for proper bidi + layout mirroring.
export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGES.has(code);
}

export function getDirection(code: string): "rtl" | "ltr" {
  return isRtlLanguage(code) ? "rtl" : "ltr";
}
