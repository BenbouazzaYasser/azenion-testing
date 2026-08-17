import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { LiveSessionsHero } from "@/components/sections/academy/live-sessions-hero";
import { UpcomingSessions } from "@/components/sections/academy/upcoming-sessions";
import { RequestSessionSection } from "@/components/sections/academy/request-session-section";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
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

export default async function LiveSessionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let hostOptions: ManageableHostOption[] = [];

  if (user) {
    const { data: admin } = await supabase.rpc("is_platform_admin");
    isAdmin = !!admin;

    const { data: hosts } = await supabase.rpc("get_manageable_session_hosts");
    hostOptions = (hosts ?? []) as ManageableHostOption[];
  }

  const { data: sessionRows } = await supabase.rpc("get_live_sessions");

  const sessions: LiveSessionWithManage[] = ((sessionRows ?? []) as LiveSessionRow[]).map(
    (session) => {
      const canManage =
        isAdmin ||
        (user !== null && session.created_by === user.id) ||
        hostOptions.some(
          (host) => host.host_type === session.host_type && host.host_id === session.host_id
        );
      return { ...session, canManage };
    }
  );

  const canCreate = hostOptions.length > 0;

  const { data: branchRows } = await supabase
    .from("branches")
    .select("id, name")
    .order("name");

  const branches: BranchOption[] = (branchRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
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
