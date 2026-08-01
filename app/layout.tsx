import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
