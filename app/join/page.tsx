import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { JoinCard } from "@/components/sections/join/join-card";

export const metadata: Metadata = {
  title: "Join Azenion | The Limitless Network",
  description:
    "Become part of The Limitless Network and start building alongside ambitious students, innovators and creators.",
};

export default function JoinPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <JoinCard />
      </main>
      <Footer />
    </>
  );
}
