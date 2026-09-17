"use client";

export function InlineScript({ html }: { html: string }) {
  // L3: fail closed on future misuse — current safe uses contain no markup or JS URLs.
  if (html.includes("<") || /javascript:/i.test(html)) {
    throw new Error("InlineScript: unsafe html blocked.");
  }
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}