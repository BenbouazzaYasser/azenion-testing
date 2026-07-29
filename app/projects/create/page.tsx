import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { CreateProjectHero } from "@/components/sections/projects/create-project-hero";
import { CreateProjectForm } from "@/components/sections/projects/create-project-form";

export const metadata: Metadata = {
  title: "Create a Project | Azenion — The Limitless Network",
  description:
    "Create a project on Azenion and find collaborators to bring your idea to life within the Limitless Network.",
};

export default function CreateProjectPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <CreateProjectHero />
        <CreateProjectForm />
      </main>
      <Footer />
    </>
  );
}
