import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { LabsBrowser } from "@/components/sections/academy/labs-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { getLabsAuthContext } from "@/lib/labs/authorization";
import type { LabRow } from "@/lib/validations/lab.schema";
import { serverT } from "@/lib/translation/server";

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

  // Mirrors the backend gates in academy-labs.actions.ts. Unlike Courses
  // (where any manager can edit any course), Labs restrict update/delete
  // to the lab's own creator unless the user is a platform admin. So "can
  // create a lab" (role-based: instructor/creator/core_team_member/admin)
  // and "can manage THIS lab" (ownership-based, admin overrides) are two
  // different questions -- computed separately here and resolved per-card
  // in LabsBrowser/LabCard, rather than a single blanket flag. This is
  // UI-only: the server actions re-check authorization independently
  // regardless of what renders here.
  const { isPlatformAdmin: isPlatformAdminUser, canCreateLab: canCreate } = await getLabsAuthContext(
    supabase,
    user?.id,
  );

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
          eyebrow={await serverT("academy.labsEyebrow")}
          title={await serverT("academy.labsH1")}
          accent={await serverT("academy.labsH1Accent")}
          subtitle={await serverT("academy.labsSubtitle")}
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
