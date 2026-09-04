import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Serve an uploaded course file through the Azenion origin so that the
 * response headers are controlled by this application rather than by the
 * storage bucket defaults.
 *
 * Access model (from the courses RLS in 00095/00096/00101): courses are
 * public catalog content. The `courses` table is publicly readable
 * (`using (true)`, select granted to anon) and the `course-files` objects
 * carry a public `select` policy. There is no enrollment/ownership model for
 * courses, so course files are intentionally readable by every visitor,
 * authenticated or anonymous.
 *
 * Security posture:
 *   - Reads go through the user-scoped Supabase client so the database RLS
 *     policies are the authorization layer. The service-role client is never
 *     used for file access. If a course restriction (e.g. enrollment or
 *     is_published) is introduced later, that check belongs here, BEFORE the
 *     storage read.
 *   - The object path is read from the `courses` row for the requested id and
 *     validated against a strict pattern. Client-supplied file paths are
 *     never trusted.
 *   - Only PDFs are served inline (browser PDF viewers are sandboxed). All
 *     other content — including uploaded .html/.css/.js/.mjs/.zip — is forced
 *     to download with an opaque Content-Type so attacker-supplied HTML/JS is
 *     never rendered/executed on the Azenion origin.
 */

const PDF_CONTENT_TYPE = "application/pdf";
const DOWNLOAD_CONTENT_TYPE = "application/octet-stream";

function fileExtension(filePath: string): string {
  return filePath.split(".").pop()?.toLowerCase() ?? "";
}

function isSafeObjectPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= 500 &&
    /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/i.test(path)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  // Resolve the request's auth principal. Course files are public content by
  // design (see above), so both anonymous and authenticated visitors are
  // allowed; this read path intentionally delegates the access decision to
  // Supabase RLS instead of the service-role client.
  const supabase = createClient();
  await supabase.auth.getUser();

  const { data: course, error } = await supabase
    .from("courses")
    .select("content_type, file_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !course?.file_path) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (!isSafeObjectPath(course.file_path)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const ext = fileExtension(course.file_path);
  const isPdf = course.content_type === "pdf" && ext === "pdf";

  const { data: blob, error: downloadError } = await supabase.storage
    .from("course-files")
    .download(course.file_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Security-Policy": "sandbox",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=3600",
  };

  if (isPdf) {
    headers["Content-Type"] = PDF_CONTENT_TYPE;
    headers["Content-Disposition"] = `inline; filename="course-${id}.pdf"`;
  } else {
    headers["Content-Type"] = DOWNLOAD_CONTENT_TYPE;
    headers["Content-Disposition"] = `attachment; filename="course-${id}.${ext}"`;
  }

  return new NextResponse(blob, {
    status: 200,
    headers,
  });
}
