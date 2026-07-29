import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { ProjectsHero } from "@/components/sections/projects/hero";
import { SearchFilters } from "@/components/sections/projects/search-filters";
import { ProjectShowcase } from "@/components/sections/projects/project-showcase";
import { CreateProject } from "@/components/sections/projects/create-project";
import { WhyBuild } from "@/components/sections/projects/why-build";
import { FutureVision } from "@/components/sections/projects/future-vision";

export const metadata: Metadata = {
  title: "Projects | Azenion — The Limitless Network",
  description:
    "Discover projects built by the Azenion community — find collaborators, build real-world products, and turn ideas into reality.",
};

export default function ProjectsPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <ProjectsHero />
        <SearchFilters />
        <ProjectShowcase />
        <CreateProject />
        <WhyBuild />
        <FutureVision />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
