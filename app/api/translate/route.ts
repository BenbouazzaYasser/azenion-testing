import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PRODUCT_NAMES = ["Azenion", "Zen", "Asteria", "Astral", "Nexion"];

// Exact UI nav translations — MyMemory mangles short labels out of context.
// Returning these directly guarantees polished, formal MSA.
const ARABIC_EXACT_MAP: Record<string, string> = {
  Home: "الرئيسية",
  Teams: "الفرق",
  Projects: "المشاريع",
  Branches: "الفروع",
  Servers: "الخوادم",
  Community: "المجتمع",
  Feed: "الموجز",
  Showcase: "المعرض",
  Announcements: "الإعلانات",
  Chat: "الدردشة",
  Academy: "الأكاديمية",
  Courses: "الدورات",
  "Live Sessions": "الجلسات المباشرة",
  Labs: "المختبرات",
  Search: "البحث",
  Settings: "الإعدادات",
  Profile: "الملف الشخصي",
  Notifications: "الإشعارات",
  "Log in": "تسجيل الدخول",
  Login: "تسجيل الدخول",
  "Sign up": "إنشاء حساب",
  "Sign Out": "تسجيل الخروج",
  "Join Azenion": "انضم إلى Azenion",
  Create: "إنشاء",
  Edit: "تعديل",
  Delete: "حذف",
  Save: "حفظ",
  Cancel: "إلغاء",
  Back: "رجوع",
  Next: "التالي",
  Submit: "إرسال",
  Filter: "تصفية",
  Loading: "جاري التحميل...",
  View: "عرض",
  Details: "التفاصيل",
  Join: "انضمام",
  Leave: "مغادرة",
  Share: "مشاركة",
  Like: "إعجاب",
  Comment: "تعليق",
  Send: "إرسال",
  Message: "رسالة",
  Members: "الأعضاء",
  Admin: "الإدارة",
  Manage: "إدارة",
  Language: "اللغة",
  Appearance: "المظهر",
  Security: "الأمان",
};

// --- Arabic polish helpers ---------------------------------------------------
// Formal Modern Standard Arabic (MSA) — consistent, polished UI tone.

const ARABIC_GLOSSARY: Array<[RegExp, string]> = [
  // Navigation / common UI — fix MyMemory's overly-literal choices.
  // Note: \b is ASCII-only in JS, so for Arabic we match without boundary.
  [/المنزل/g, "الرئيسية"],
  [/لوحة القيادة/g, "لوحة التحكم"],
  [/تغذية/g, "الموجز"],
  [/الدورات التدريبية/g, "الدورات"],
  [/إضغط/g, "اضغط"],
  [/إحفظ/g, "احفظ"],
  // High-impact nav fixes (MyMemory mangles these out of context):
  [/مراكز التسوق المجتمعية/g, "المجتمع"],
  [/مركز التسوق المجتمعي/g, "المجتمع"],
  [/فريق العمل/g, "الفرق"],
  // MyMemory sometimes returns a glossary note like "[ترجمة المصطلح: Chat]" or "[Chat: ترجمة المصطلح]" for single-word UI terms.
  // Replace the entire note regardless of order/brackets/colon direction.
  [/\[\s*ترجمة المصطلح\s*[:：]\s*Chat\s*\]/g, "الدردشة"],
  [/\[\s*Chat\s*[:：]\s*ترجمة المصطلح\s*\]/g, "الدردشة"],
  [/ترجمة المصطلح\s*[:：]\s*Chat/g, "الدردشة"],
  [/Chat\s*[:：]\s*ترجمة المصطلح/g, "الدردشة"],
  [/ترجمة المصطلح/g, "الدردشة"],
  // Clean any remaining stray brackets/colons left after the above
  [/^\[\s*/g, ""],
  [/\s*\]$/g, ""],
  [/^\s*[:：]\s*/g, ""],
  [/\s*[:：]\s*$/g, ""],
];

function polishArabic(text: string): string {
  let out = text;

  // 1) Strip tatweel (ـ) that MyMemory sometimes inserts.
  out = out.replace(/\u0640/g, "");

  // 2) Glossary fixes (formal MSA)
  for (const [re, rep] of ARABIC_GLOSSARY) out = out.replace(re, rep);

  // 3) Western punctuation → Arabic punctuation when in Arabic context.
  //    Only convert when the string contains Arabic letters to avoid touching brand/code.
  const hasArabic = /[\u0600-\u06FF]/.test(out);
  if (hasArabic) {
    // Convert comma/semicolon/question that are clearly sentence punctuation.
    // We do conservative replacements: `, ` -> `،` etc., and lone `?` -> `؟`.
    out = out
      .replace(/,\s*/g, "، ")
      .replace(/;\s*/g, "؛ ")
      .replace(/\?\s*/g, "؟ ")
      .replace(/!\s*/g, "! "); // keep ! as is (Arabic shares !) but normalise spacing
    // Fix cases where MyMemory already used Arabic punctuation with bad spacing
    out = out
      .replace(/\s+،/g, "،")
      .replace(/\s+؛/g, "؛")
      .replace(/\s+؟/g, "؟")
      .replace(/،\s{2,}/g, "، ")
      .replace(/؛\s{2,}/g, "؛ ")
      .replace(/؟\s{2,}/g, "؟ ");
  }

  // 4) Normalise whitespace & trim, collapse 2+ spaces
  out = out.replace(/\s{2,}/g, " ").trim();

  // 5) Fix spacing before closing punctuation and after opening — tiny polish that
  //    makes Arabic look professionally typeset.
  out = out.replace(/\s+([.،؛؟!:)])/g, "$1");
  out = out.replace(/([(\[])\s+/g, "$1");

  // 6) Ensure sentence starts with proper capitalisation handling is irrelevant
  //    for Arabic but we keep first char not lowercased artefact.
  //    Also fix MyMemory quirk where it returns " \n " wrappers.
  out = out.replace(/^\s+|\s+$/g, "");

  return out;
}

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

async function fetchMyMemory(text: string, source: string, target: string): Promise<string | null> {
  // Fast-path polished exact matches — no network, no MyMemory noise.
  if (target === "ar") {
    const exact = ARABIC_EXACT_MAP[text.trim()];
    if (exact) return exact;
  }
  const { text: prepared, tokens } = protectNames(text);
  // `de` (email) gives MyMemory higher quota/better TM matching; not required but improves polish.
  const email = process.env.MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}` : "";
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(prepared)}` +
    `&langpair=${source}|${target}${email}&mt=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const translated = data.responseData?.translatedText;
    if (!translated) return null;
    let out = restoreNames(translated, tokens);
    if (target === "ar") out = polishArabic(out);
    // Avoid returning empty or unchanged-after-polish that equals source lowercased
    if (!out.trim()) return null;
    return out;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { texts, source = "en", target } = body as {
    texts?: unknown;
    source?: unknown;
    target?: unknown;
  };

  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ error: "texts[] required" }, { status: 400 });
  }
  if (typeof target !== "string" || !target) {
    return NextResponse.json({ error: "target required" }, { status: 400 });
  }
  const src = typeof source === "string" ? source : "en";
  if (src === target) {
    const map: Record<string, string> = {};
    for (const t of texts as string[]) if (typeof t === "string") map[t] = t;
    return NextResponse.json({ translations: map });
  }

  const unique = [...new Set((texts as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0))].slice(0, 150);

  const results: Array<[string, string | null]> = [];
  const CHUNK_SIZE = 10;
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (text) => [text, await fetchMyMemory(text, src, target)] as [string, string | null])
    );
    results.push(...chunkResults);
  }

  const translations: Record<string, string> = {};
  for (const [original, translated] of results) {
    if (translated && translated.trim() && translated.toLowerCase() !== original.toLowerCase()) {
      translations[original] = translated;
    }
  }

  return NextResponse.json({ translations });
}
