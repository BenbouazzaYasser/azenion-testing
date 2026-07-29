import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AboutHero } from "@/components/sections/about/hero";
import { OurStory } from "@/components/sections/about/our-story";
import { OurMission } from "@/components/sections/about/our-mission";
import { CoreValues } from "@/components/sections/about/core-values";
import { WhoBelongs } from "@/components/sections/about/who-belongs";
import { Ecosystem } from "@/components/sections/about/ecosystem";
import { Vision } from "@/components/sections/about/vision";
import { ClosingCta } from "@/components/sections/about/closing-cta";

export const metadata: Metadata = {
  title: "About — Azenion",
  description:
    "Azenion is building a global network where ambitious minds connect, collaborate, and create the future together.",
  openGraph: {
    title: "About — Azenion",
    description:
      "A global network connecting ambitious minds through learning, collaboration and innovation.",
  },
};

export default function AboutPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <AboutHero />
        <OurStory />
        <OurMission />
        <CoreValues />
        <WhoBelongs />
        <Ecosystem />
        <Vision />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
