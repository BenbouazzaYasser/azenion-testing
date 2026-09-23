import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { CreateTeamHero } from "@/components/sections/teams/create-team-hero";
import { CreateTeamForm } from "@/components/sections/teams/create-team-form";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Create a Team | Azenion — The Limitless Network",
  description:
    "Create a team on Azenion and start building with ambitious collaborators from across the Limitless Network.",
};

export default function CreateTeamPage() {
  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <CreateTeamHero />
        <CreateTeamForm />
      </main>
      <Footer />
    </>
  );
}
