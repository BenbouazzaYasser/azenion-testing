// Intentionally a Server Component: it renders a static <script> tag with no
// interactivity. The previous "use client" forced a client boundary + JS chunk
// inside the root layout for zero benefit.
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