import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { CoursesBrowser } from "@/components/sections/academy/courses-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import type { CourseRow } from "@/lib/validations/course.schema";

export const metadata: Metadata = {
  title: "Courses | Azenion Academy — The Limitless Network",
  description:
    "Browse Azenion Academy courses — self-paced learning paths across programming, engineering, AI, mathematics, cybersecurity and design.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManage = false;
  if (user) {
    const { data: isCoreTeam } = await supabase.rpc("is_core_team_member");
    canManage = isCoreTeam === true;
  }

  const { data: courseRows } = await supabase
    .from("courses")
    .select(
      "id, title, description, category, content_type, file_url, thumbnail, duration, difficulty, tags, created_by, created_at",
    )
    .order("created_at", { ascending: false });

  const courses = ((courseRows ?? []) as unknown as CourseRow[]).map((row) => ({
    ...row,
    content_type: (row.content_type === "pdf" ? "pdf" : "html_css") as CourseRow["content_type"],
  }));

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <AcademyHero
          eyebrow="Academy · Courses"
          title="Learn at Your"
          accent="Own Pace."
          subtitle="Self-paced learning paths crafted for every level — dive in whenever you are ready."
        />
        <CoursesBrowser courses={courses} canManage={canManage} />
        <AcademyClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}