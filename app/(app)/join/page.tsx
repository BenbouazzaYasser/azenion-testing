import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { JoinCard } from "@/components/sections/join/join-card";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Join Azenion | The Limitless Network",
  description:
    "Become part of The Limitless Network and start building alongside ambitious students, innovators and creators.",
};

export default function JoinPage() {
  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <JoinCard />
      </main>
      <Footer />
    </>
  );
}
