import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { CoursesBrowser } from "@/components/sections/academy/courses-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/user";
import type { CourseRow } from "@/lib/validations/course.schema";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Courses | Azenion Academy — The Limitless Network",
  description:
    "Browse Azenion Academy courses — self-paced learning paths across programming, engineering, AI, cybersecurity, web development, blockchain, networking, databases, game development, robotics, IoT, embedded systems and more.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = await createClient();

  const user = await getSessionUser();

  // Canonical manager gate (core_team_member, creator, platform-admin
  // override) — same oracle the write actions and file route use.
  let canManage = false;
  if (user) {
    const { data } = await supabase.rpc("is_course_manager");
    canManage = data === true;
  }

  // Regular visitors (and anon) only ever see published courses, so they
  // never hit a draft card whose file bytes would 404. Managers see the
  // full catalog with status badges + publish controls.
  let query = supabase
    .from("courses")
    .select(
      "id, title, description, category, content_type, file_url, thumbnail, duration, difficulty, tags, created_by, created_at, status",
    )
    .order("created_at", { ascending: false });

  if (!canManage) {
    query = query.eq("status", "published");
  }

  const { data: courseRows } = await query;

  const courses = ((courseRows ?? []) as unknown as CourseRow[]).map((row) => ({
    ...row,
    content_type: (row.content_type === "pdf" ? "pdf" : "html_css") as CourseRow["content_type"],
  }));

  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          eyebrow={await serverT("academy.coursesEyebrow")}
          title={await serverT("academy.coursesH1")}
          accent={await serverT("academy.coursesH1Accent")}
          subtitle={await serverT("academy.coursesSubtitle")}
        />
        <CoursesBrowser courses={courses} canManage={canManage} />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}