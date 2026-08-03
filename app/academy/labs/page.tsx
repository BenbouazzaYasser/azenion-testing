import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { LabsHero } from "@/components/sections/academy/labs-hero";
import { LabsBlueprint } from "@/components/sections/academy/labs-blueprint";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Labs | Azenion Academy — The Limitless Network",
  description:
    "Azenion Academy Labs is coming soon — a space for collaborative projects, research, hackathons and experimentation.",
};

export default function LabsPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <LabsHero />
        <LabsBlueprint />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
