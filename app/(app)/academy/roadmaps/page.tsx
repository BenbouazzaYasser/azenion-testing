import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { RoadmapsBrowser } from "@/components/sections/academy/roadmaps/roadmaps-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";
import { listRoadmapSummaries } from "@/lib/roadmaps/catalog";

export const metadata: Metadata = {
  title: "Roadmaps | Azenion Academy — The Limitless Network",
  description:
    "Structured learning paths combining courses, labs, and hands-on challenges to help you build your skills from the ground up.",
};

// Summaries carry per-caller progress (anon vs signed-in), so the page can't
// be statically shared across users.
export const dynamic = "force-dynamic";

async function getRoadmapsHeroCopy() {
  const [eyebrow, title, accent, subtitle] = await Promise.all([
    serverT("academy.roadmapsEyebrow"),
    serverT("academy.roadmapsH1"),
    serverT("academy.roadmapsH1Accent"),
    serverT("academy.roadmapsSubtitle"),
  ]);
  return { eyebrow, title, accent, subtitle };
}

export default async function RoadmapsPage() {
  const roadmaps = await listRoadmapSummaries();

  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero {...(await getRoadmapsHeroCopy())} />
        <RoadmapsBrowser roadmaps={roadmaps} />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}