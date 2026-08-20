import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyLandingHero } from "@/components/sections/academy/academy-landing-hero";
import { AcademyFeatures } from "@/components/sections/academy/academy-features";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Academy | Azenion — The Limitless Network",
  description:
    "Explore the Azenion Academy — curated courses, live sessions and hands-on labs to learn, build and grow with the community.",
};

export default function AcademyPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyLandingHero />
        <AcademyFeatures />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
