import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { RoadmapDetailView } from "@/components/sections/academy/roadmaps/roadmap-detail";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";
import { getRoadmapBySlug } from "@/lib/roadmaps/catalog";
import { getSessionUser } from "@/lib/supabase/user";

// Progress/statuses depend on the signed-in caller, so the page is dynamic.
export const dynamic = "force-dynamic";

interface RoadmapDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RoadmapDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = await getRoadmapBySlug(slug);
  if (!roadmap) return {};
  return {
    title: `${roadmap.title} | Azenion Academy Roadmaps`,
    description:
      roadmap.description ||
      "A structured learning path on Azenion Academy.",
  };
}

export default async function RoadmapSlugPage({
  params,
}: RoadmapDetailPageProps) {
  const { slug } = await params;
  const [roadmap, user] = await Promise.all([
    getRoadmapBySlug(slug),
    getSessionUser(),
  ]);

  if (!roadmap) {
    notFound();
  }

  const [backLabel, progressLabel] = await Promise.all([
    serverT("academy.backToRoadmaps"),
    serverT("academy.roadmapProgress"),
  ]);

  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <RoadmapDetailView
          roadmap={roadmap}
          backLabel={backLabel}
          progressLabel={progressLabel}
          signedIn={user !== null}
        />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}