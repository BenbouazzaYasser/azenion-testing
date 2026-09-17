import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AcademyHero } from "@/components/sections/academy/academy-hero";
import { CoursesBrowser } from "@/components/sections/academy/courses-browser";
import { AcademyClosingCta } from "@/components/sections/academy/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
import { JsonLd, siteUrl } from "@/components/seo/json-ld";
import type { CourseRow } from "@/lib/validations/course.schema";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Courses | Azenion Academy — The Limitless Network",
  description:
    "Browse Azenion Academy courses — self-paced learning paths across programming, engineering, AI, cybersecurity, web development, blockchain, networking, databases, game development, robotics, IoT, embedded systems and more.",
};

export const dynamic = "force-dynamic";

const COURSE_SELECT =
  "id, title, description, category, content_type, file_url, thumbnail, duration, difficulty, tags, created_by, created_at, status";

async function fetchPublishedCourses() {
  // Public, non-user-specific content: published courses only, served
  // through the admin client with the same explicit filter anon visitors
  // previously got under RLS. Managers bypass this cache (see below) so
  // drafts never leak into the shared entry.
  const admin = createAdminClient();
  const { data: courseRows } = await admin
    .from("courses")
    .select(COURSE_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return courseRows ?? [];
}

const getPublishedCourses = unstable_cache(fetchPublishedCourses, ["courses-page-data"], {
  revalidate: 120,
});

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
  let courseRows: unknown[];
  if (canManage) {
    const { data } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .order("created_at", { ascending: false });
    courseRows = (data ?? []) as unknown[];
  } else {
    courseRows = (await getPublishedCourses()) as unknown[];
  }

  const courses = ((courseRows ?? []) as unknown as CourseRow[]).map((row) => ({
    ...row,
    content_type: (row.content_type === "pdf" ? "pdf" : "html_css") as CourseRow["content_type"],
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Azenion Academy Courses",
          itemListElement: courses.slice(0, 20).map((course, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Course",
              name: course.title,
              description: course.description ?? undefined,
              provider: {
                "@type": "Organization",
                name: "Azenion",
                url: siteUrl(),
              },
            },
          })),
        }}
      />
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