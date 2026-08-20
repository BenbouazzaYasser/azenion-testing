import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { CreateProjectHero } from "@/components/sections/projects/create-project-hero";
import { CreateProjectForm } from "@/components/sections/projects/create-project-form";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Create a Project | Azenion — The Limitless Network",
  description:
    "Create a project on Azenion and find collaborators to bring your idea to life within the Limitless Network.",
};

export default async function CreateProjectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: userTeams } = await adminClient.rpc("get_user_teams", {
    p_user_id: user.id,
  });

  const teams = ((userTeams ?? []) as {
    team_id: string;
    role: string;
    team_slug: string;
    team_name: string;
    team_logo_url: string | null;
  }[]).filter((t) => t.role === "owner" || t.role === "admin");

  const { data: allCategories } = await adminClient
    .from("project_categories")
    .select("id, name, slug")
    .order("name");

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <CreateProjectHero />
        <CreateProjectForm teams={teams} categories={allCategories ?? []} />
      </main>
      <Footer />
    </>
  );
}
