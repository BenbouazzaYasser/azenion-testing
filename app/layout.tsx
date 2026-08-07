import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import { CursorGlow } from "@/components/graphics/cursor-glow";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";

const VALID_THEMES: Theme[] = ["system", "light", "dark"];

export const metadata: Metadata = {
  title: "Azenion — Infinite minds. Limitless impact.",
  description:
    "Azenion is a global network connecting ambitious students, developers, designers, entrepreneurs and innovators through learning, collaboration and building impactful projects.",
  metadataBase: new URL("https://azenion.io"),
  openGraph: {
    title: "Azenion — Infinite minds. Limitless impact.",
    description: "A global network connecting ambitious minds through learning, collaboration and innovation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieTheme = cookies().get("azenion-theme")?.value as Theme | undefined;
  const initialTheme: Theme = VALID_THEMES.includes(cookieTheme as Theme)
    ? (cookieTheme as Theme)
    : "system";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=(function(){try{return localStorage.getItem("azenion-theme")}catch(e){return null}})();if(!t){var c=document.cookie.match(/(?:^|; )azenion-theme=([^;]*)/);t=c?c[1]:null}if(!t)t="system";var e=(t==="system")?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;var d=document.documentElement;d.dataset.theme=e;d.dataset.themePreference=t;d.style.colorScheme=e;}catch(err){document.documentElement.dataset.theme="dark";}`,
          }}
        />
      </head>
      <body className="overflow-x-hidden md:overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.025] mix-blend-overlay"
        />
        <CursorGlow />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "rgba(14,16,22,0.92)",
              border: "1px solid rgba(244,245,248,0.14)",
              color: "#F4F5F8",
              backdropFilter: "blur(20px)",
            },
            duration: 4000,
          }}
        />
        <ThemeProvider initialTheme={initialTheme}>
          <OnboardingProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
