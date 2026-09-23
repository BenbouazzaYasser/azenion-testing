import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { LiveSessionsHero } from "@/components/sections/academy/live-sessions-hero";
import { UpcomingSessions } from "@/components/sections/academy/upcoming-sessions";
import { RequestSessionSection } from "@/components/sections/academy/request-session-section";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
import { JsonLd, siteUrl } from "@/components/seo/json-ld";
import type { BranchOption } from "@/components/sections/academy/request-session-dialog";
import type {
  LiveSessionRow,
  LiveSessionWithManage,
  ManageableHostOption,
} from "@/lib/validations/live-session.schema";

export const metadata: Metadata = {
  title: "Live Sessions | Azenion Academy — The Limitless Network",
  description:
    "Join live sessions from Azenion Academy — interactive workshops, talks and deep dives, online and in person.",
};

export const dynamic = "force-dynamic";

async function fetchPublicSessions() {
  // Public, non-user-specific content: the session catalog and branch
  // list, served through the admin client. This mirrors the home page,
  // which already calls get_live_sessions via the admin client inside its
  // cached fetcher and renders the result to anonymous visitors.
  // Per-visitor manage permissions are overlaid below and stay dynamic.
  const admin = createAdminClient();
  const [{ data: sessionRows }, { data: branchRows }] = await Promise.all([
    admin.rpc("get_live_sessions"),
    admin.from("branches").select("id, name").order("name"),
  ]);
  return {
    sessionRows: (sessionRows ?? []) as LiveSessionRow[],
    branchRows: (branchRows ?? []) as { id: string; name: string }[],
  };
}

const getPublicSessions = unstable_cache(fetchPublicSessions, ["live-sessions-page-data"], {
  revalidate: 60,
});

export default async function LiveSessionsPage() {
  const supabase = await createClient();

  const user = await getSessionUser();

  let isAdmin = false;
  let hostOptions: ManageableHostOption[] = [];

  if (user) {
    const { data: admin } = await supabase.rpc("is_platform_admin");
    isAdmin = !!admin;

    const { data: hosts } = await supabase.rpc("get_manageable_session_hosts");
    hostOptions = (hosts ?? []) as ManageableHostOption[];
  }

  const { sessionRows, branchRows } = await getPublicSessions();

  const sessions: LiveSessionWithManage[] = (sessionRows ?? []).map((session) => {
    const canManage =
      isAdmin ||
      (user !== null && session.created_by === user.id) ||
      hostOptions.some(
        (host) => host.host_type === session.host_type && host.host_id === session.host_id,
      );
    return { ...session, canManage };
  });

  const canCreate = hostOptions.length > 0;

  const branches: BranchOption[] = branchRows.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Azenion Academy Live Sessions",
          itemListElement: sessions.slice(0, 20).map((session, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Event",
              name: session.title,
              description: session.description || undefined,
              startDate: session.starts_at,
              eventStatus: "https://schema.org/EventScheduled",
              location: session.location
                ? { "@type": "Place", name: session.location }
                : { "@type": "VirtualLocation", url: `${siteUrl()}/academy/live-sessions` },
              organizer: {
                "@type": "Organization",
                name: session.host_name || "Azenion",
                url: siteUrl(),
              },
            },
          })),
        }}
      />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <LiveSessionsHero />
        <UpcomingSessions
          sessions={sessions}
          canCreate={canCreate}
          hostOptions={hostOptions}
        />
        <RequestSessionSection branches={branches} isAuthenticated={!!user} />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
