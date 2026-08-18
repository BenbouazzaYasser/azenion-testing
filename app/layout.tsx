import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { CursorGlow } from "@/components/graphics/cursor-glow";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { CallProvider } from "@/components/chat/call-provider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Azenion — Infinite minds. Limitless impact.",
  description:
    "Azenion is a global network connecting ambitious students, developers, designers, entrepreneurs and innovators through learning, collaboration and building impactful projects.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.com"),
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=(function(){try{return localStorage.getItem("azenion-theme")}catch(e){return null}})();if(!t){var c=document.cookie.match(/(?:^|; )azenion-theme=([^;]*)/);t=c?c[1]:null}if(!t)t="dark";var e=(t==="system")?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;var d=document.documentElement;d.dataset.theme=e;d.dataset.themePreference=t;d.style.colorScheme=e;}catch(err){document.documentElement.dataset.theme="dark";}`,
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
        <ThemeProvider>
          <AuthProvider>
            <OnboardingProvider />
            <CallProvider>{children}</CallProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
