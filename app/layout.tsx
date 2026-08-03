import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { CursorGlow } from "@/components/graphics/cursor-glow";

export const metadata: Metadata = {
  title: "Azenion — Infinite minds. Limitless impact.",
  description:
    "Azenion is a global network connecting ambitious students, developers, designers, entrepreneurs and innovators through learning, collaboration and building impactful projects.",
  metadataBase: new URL("https://azenion.io"),
  openGraph: {
    title: "Azenion — Infinite minds. Limitless impact.",
    description:
      "A global network connecting ambitious minds through learning, collaboration and innovation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
        {children}
      </body>
    </html>
  );
}
