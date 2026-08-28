import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { LabsBrowser } from "@/components/sections/academy/labs-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import type { LabRow } from "@/lib/validations/lab.schema";

export const metadata: Metadata = {
  title: "Labs | Azenion Academy — The Limitless Network",
  description:
    "Practical, hands-on labs across OSINT, Linux and coding — put what you learn in Azenion Academy into practice.",
};

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mirrors the Phase 2 backend gates. Unlike Courses (where any manager
  // can edit any course), Labs restrict update/delete to the lab's own
  // creator unless the user is a platform admin (Phase 0). So "can create
  // a lab" (role-based) and "can manage THIS lab" (ownership-based, admin
  // overrides) are two different questions -- computed separately here and
  // resolved per-card in LabsBrowser/LabCard, rather than a single blanket
  // flag. This is UI-only: the server actions re-check authorization
  // independently regardless of what renders here.
  //
  // Admin detection uses has_platform_role('platform_admin') rather than
  // the raw is_platform_admin() RPC: this platform recognizes admins two
  // ways -- a row in public.platform_admins, or the 'platform_admin' role
  // in user_roles (the latter being what /admin/roles actually grants).
  // has_platform_role() already ORs both together, so this picks up
  // either representation without introducing a new check. Core team
  // members are also allowed to create and manage labs.
  let isPlatformAdminUser = false;
  let isCoreTeamUser = false;
  let isInstructorOrCreator = false;
  if (user) {
    const [{ data: paData }, { data: ctData }] = await Promise.all([
      supabase.rpc("has_platform_role", { p_role_name: "platform_admin" }),
      supabase.rpc("has_platform_role", { p_role_name: "core_team_member" }),
    ]);
    isPlatformAdminUser = Boolean(paData);
    isCoreTeamUser = Boolean(ctData);
    if (!isPlatformAdminUser && !isCoreTeamUser) {
      const { data: roleRows } = await supabase.from("user_roles").select("roles(name)").eq("user_id", user.id);
      const roles = (roleRows as Array<{ roles: { name: string } | { name: string }[] | null }> | null) ?? [];
      isInstructorOrCreator = roles.some((row) => {
        const r = row.roles as unknown as { name: string } | { name: string }[] | null;
        if (!r) return false;
        const names = Array.isArray(r) ? r.map((x) => x.name) : [r.name];
        return names.includes("instructor") || names.includes("creator");
      });
    }
  }
  const canCreate = isPlatformAdminUser || isCoreTeamUser || isInstructorOrCreator;

  // Published labs for everyone; a manager also sees their own unpublished
  // labs (matching the existing "creators can read their own labs" /
  // "platform admins can read all labs" RLS policies).
  const labsQuery = supabase
    .from("labs")
    .select(
      "id, title, description, category, difficulty, type, estimated_duration_minutes, tags, thumbnail_url, is_published, published_at, archived_at, created_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const { data: labRows } = canCreate ? await labsQuery : await labsQuery.eq("is_published", true);

  const labs = (labRows ?? []) as unknown as LabRow[];

  // Only fetched for managers, who need it for the course-link selector in
  // LabEditDialog.
  let availableCourses: { id: string; title: string }[] = [];
  if (canCreate) {
    const { data: courseRows } = await supabase.from("courses").select("id, title").order("title", { ascending: true });
    availableCourses = courseRows ?? [];
  }

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          eyebrow="Academy · Labs"
          title="Practice What You"
          accent="Learn."
          subtitle="Hands-on labs across OSINT, Linux and coding — investigate, solve, and prove what you know."
        />
        <LabsBrowser
          labs={labs}
          canCreate={canCreate}
          isPlatformAdmin={isPlatformAdminUser}
          currentUserId={user?.id ?? null}
          availableCourses={availableCourses}
        />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
