import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { ProjectDetailHero } from "@/components/sections/projects/project-detail-hero";
import { ProjectAbout } from "@/components/sections/projects/project-about";
import { ProjectTech } from "@/components/sections/projects/project-tech";
import { ProjectContributors } from "@/components/sections/projects/project-contributors";
import { ProjectRoles } from "@/components/sections/projects/project-roles";
import { ProjectRoadmap } from "@/components/sections/projects/project-roadmap";
import { ProjectJoinCta } from "@/components/sections/projects/project-join-cta";
import { getProjectBySlug, projects } from "@/data/projects";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: `${project.title} | Azenion — The Limitless Network`,
    description: project.tagline,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <ProjectDetailHero project={project} />
        <ProjectAbout project={project} />
        <ProjectTech project={project} />
        <ProjectContributors project={project} />
        <ProjectRoles project={project} />
        <ProjectRoadmap project={project} />
        <ProjectJoinCta project={project} />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
