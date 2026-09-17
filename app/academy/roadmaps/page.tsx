import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { RoadmapsComingSoon } from "@/components/sections/academy/roadmaps/roadmaps-coming-soon";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Roadmaps | Azenion Academy — The Limitless Network",
  description:
    "Structured learning paths combining courses, labs, and hands-on challenges to help you build your skills from the ground up. Coming soon to Azenion Academy.",
};

// Fully static: no data fetches on this page (Coming Soon shell).
export const dynamic = "force-static";

export default async function RoadmapsPage() {
  // Coming Soon: the interactive roadmap foundation (lib/roadmaps +
  // roadmap-* components) stays in the repo but is deliberately not loaded
  // here until the backend lands.
  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          eyebrow={await serverT("academy.roadmapsEyebrow")}
          title={await serverT("academy.roadmapsH1")}
          accent={await serverT("academy.roadmapsH1Accent")}
          subtitle={await serverT("academy.roadmapsSubtitle")}
        />
        <RoadmapsComingSoon />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
