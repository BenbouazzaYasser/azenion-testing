import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { LabsBrowser } from "@/components/sections/academy/labs-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
import { getLabsAuthContext } from "@/lib/labs/authorization";
import type { LabRow } from "@/lib/validations/lab.schema";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Labs | Azenion Academy — The Limitless Network",
  description:
    "Practical, hands-on labs across OSINT, Linux and coding — put what you learn in Azenion Academy into practice.",
};

export const dynamic = "force-dynamic";

const LAB_SELECT =
  "id, title, description, category, difficulty, type, estimated_duration_minutes, tags, thumbnail_url, is_published, published_at, archived_at, created_by, created_at, updated_at";

async function fetchPublishedLabs() {
  // Public, non-user-specific content: published labs only, served through
  // the admin client with the same explicit filter anon visitors previously
  // got under RLS. Creators bypass this cache (see below) so unpublished
  // labs never leak into the shared entry.
  const admin = createAdminClient();
  const { data: labRows } = await admin
    .from("labs")
    .select(LAB_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return labRows ?? [];
}

const getPublishedLabs = unstable_cache(fetchPublishedLabs, ["labs-page-data"], {
  revalidate: 120,
});

async function getLabsHeroCopy() {
  const [eyebrow, title, accent, subtitle] = await Promise.all([
    serverT("academy.labsEyebrow"),
    serverT("academy.labsH1"),
    serverT("academy.labsH1Accent"),
    serverT("academy.labsSubtitle"),
  ]);
  return { eyebrow, title, accent, subtitle };
}

export default async function LabsPage() {
  const supabase = await createClient();

  const [user, cachedPublished] = await Promise.all([
    getSessionUser(),
    getPublishedLabs(),
  ]);

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

  const [managedLabs, managedCourses] = canCreate
    ? await Promise.all([
        supabase.from("labs").select(LAB_SELECT).order("created_at", { ascending: false }),
        supabase.from("courses").select("id, title").order("title", { ascending: true }),
      ])
    : [];
  const labRows: unknown[] = canCreate
    ? ((managedLabs?.data ?? []) as unknown[])
    : (cachedPublished as unknown[]);

  const labs = (labRows ?? []) as unknown as LabRow[];

  const availableCourses: { id: string; title: string }[] = canCreate
    ? (managedCourses?.data ?? [])
    : [];

  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          {...await getLabsHeroCopy()}
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
