import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { CoursesBrowser } from "@/components/sections/academy/courses-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Courses | Azenion Academy — The Limitless Network",
  description:
    "Browse Azenion Academy courses — self-paced learning paths across programming, engineering, AI, mathematics, cybersecurity and design.",
};

export default function CoursesPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          eyebrow="Academy · Courses"
          title="Learn at Your"
          accent="Own Pace."
          subtitle="Self-paced learning paths crafted for every level — dive in whenever you are ready."
        />
        <CoursesBrowser />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
