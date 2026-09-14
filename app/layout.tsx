import type { Metadata } from "next";
import { Inter, Tajawal, Noto_Naskh_Arabic } from "next/font/google";
import { InlineScript } from "@/components/ui/inline-script";
import "./globals.css";
import { Toaster } from "sonner";

import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TranslationProvider } from "@/components/translation/translation-provider";
import { CallProvider } from "@/components/call/call-provider";

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tajawal = Tajawal({
  weight: ["400", "500", "700"],
  subsets: ["latin", "arabic"],
  variable: "--font-tajawal",
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  weight: ["400", "500", "600"],
  subsets: ["latin", "arabic"],
  variable: "--font-noto-naskh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Azenion — Infinite minds. Limitless impact.",
  description:
    "Azenion is a global network connecting ambitious students, developers, designers, entrepreneurs and innovators through learning, collaboration and building impactful projects.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io"),
  openGraph: {
    title: "Azenion — Infinite minds. Limitless impact.",
    description: "A global network connecting ambitious minds through learning, collaboration and innovation.",
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io",
    siteName: "Azenion",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Azenion — Infinite minds. Limitless impact.",
    description: "A global network connecting ambitious minds through learning, collaboration and innovation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${inter.variable} ${tajawal.variable} ${notoNaskhArabic.variable}`}>
      <head>
        <InlineScript
          html={`try{var t=(function(){try{return localStorage.getItem("azenion-theme")}catch(e){return null}})();if(!t){var c=document.cookie.match(/(?:^|; )azenion-theme=([^;]*)/);t=c?c[1]:null}if(!t)t="system";var e=(t==="system")?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;var d=document.documentElement;d.dataset.theme=e;d.dataset.themePreference=t;d.style.colorScheme=e;}catch(err){document.documentElement.dataset.theme="dark";}`}
        />
        <InlineScript
          html={`try{var l=null;try{l=localStorage.getItem("azenion-lang")}catch(e){}if(!l){var m=document.cookie.match(/(?:^|; )azenion-lang=([^;]*)/);l=m?decodeURIComponent(m[1]):null}if(l){document.documentElement.lang=l;var rtl=new Set(["ar","he","fa","ur"]);document.documentElement.dir=rtl.has(l)?"rtl":"ltr";}}catch(e){}`}
        />
      </head>
      <body className="overflow-x-hidden md:overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.025] mix-blend-overlay"
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-xl focus:bg-void-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-50 focus:shadow-dialog"
        >
          Skip to content
        </a>
        <Toaster
          position="bottom-center"
          className="!z-[9999]"
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
          <TranslationProvider>
            <AuthProvider>
              <OnboardingProvider />
              <CallProvider>{children}</CallProvider>
            </AuthProvider>
          </TranslationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
