import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface RoadmapDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Roadmaps | Azenion Academy — The Limitless Network",
  description:
    "Structured learning paths combining courses, labs, and hands-on challenges to help you build your skills from the ground up. Coming soon to Azenion Academy.",
};

export const dynamic = "force-dynamic";

export default async function RoadmapSlugPage({
  params,
}: RoadmapDetailPageProps) {
  // Coming Soon: the roadmap detail system isn't exposed yet. Any direct
  // slug navigation lands on the shared Coming Soon experience instead of
  // an empty or nonexistent roadmap.
  await params;
  redirect("/academy/roadmaps");
}
