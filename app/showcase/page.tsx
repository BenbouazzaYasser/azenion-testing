import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { ShowcaseHero } from "@/components/sections/showcase/hero";
import { ComingSoon } from "@/components/sections/showcase/coming-soon";
import { FuturePreview } from "@/components/sections/showcase/future-preview";
import { ClosingCta } from "@/components/sections/showcase/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Showcase | Azenion — The Limitless Network",
  description:
    "The Azenion Showcase will celebrate outstanding community projects, winning hackathon teams, and the innovative ideas that define the Limitless Network.",
};

export default function ShowcasePage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <ShowcaseHero />
        <ComingSoon />
        <FuturePreview />
        <ClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
