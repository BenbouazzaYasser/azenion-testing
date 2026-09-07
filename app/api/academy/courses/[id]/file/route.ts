import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideFileAccess } from "@/lib/payments/access";

/**
 * Serve an uploaded course file through the Azenion origin so that the
 * response headers are controlled by this application rather than by the
 * storage bucket defaults.
 *
 * Access model (from the courses RLS in 00095/00096/00101 plus the paid-course
 * entitlement model in 00123/00125): courses are public catalog content and
 * free course files are readable by every visitor, authenticated or
 * anonymous. Paid courses (is_free = false) additionally require the caller
 * to be the course owner, course staff, or the holder of an active
 * entitlement — enforced here, BEFORE the storage read. No entitlement means
 * no paid-file delivery.
 *
 * Security posture:
 *   - Authorization runs first on the user-scoped Supabase client so the
 *     database RLS policies are the authorization layer (course lookup,
 *     is_course_manager check, entitlement check, decideFileAccess gate).
 *     Only AFTER an allow-decision is the object byte-fetch performed with
 *     the server-side service-role client, because the private
 *     `course-files` bucket intentionally carries an owner-only storage
 *     SELECT policy and a user-scoped download would wrongly 404 for
 *     authorized non-owners. The service-role client never leaves the
 *     server and is never consulted for the access decision itself.
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

  // Resolve the request's auth principal. Free course files are public
  // content by design (see above). Paid files additionally require owner,
  // staff, or an active entitlement — checked here before the storage read.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error } = await supabase
    .from("courses")
    .select("content_type, file_path, status, is_free, created_by")
    .eq("id", id)
    .maybeSingle();

  if (error || !course?.file_path) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const row = course as unknown as {
    content_type: string;
    file_path: string;
    status: string | null;
    is_free: boolean | null;
    created_by: string | null;
  };

  let isStaff = false;
  let hasActiveEntitlement = false;
  if (row.is_free === false && user) {
    const { data: manages } = await supabase.rpc("is_course_manager");
    isStaff = manages === true;
    if (!isStaff) {
      const { data: entitlement } = await supabase
        .from("entitlements")
        .select("id")
        .eq("course_id", id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      hasActiveEntitlement = entitlement != null;
    }
  }

  const decision = decideFileAccess({
    isFree: row.is_free,
    ownerId: row.created_by,
    callerUserId: user?.id ?? null,
    isStaff,
    hasActiveEntitlement,
  });
  if (decision === "deny_unauthenticated") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (decision === "deny_forbidden") {
    return NextResponse.json({ error: "Purchase required" }, { status: 402 });
  }

  if (!isSafeObjectPath(row.file_path)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const ext = fileExtension(row.file_path);
  const isPdf = row.content_type === "pdf" && ext === "pdf";

  // Delivery: authorization above already returned allow. Fetch the bytes
  // with the server-side service-role client because the private bucket's
  // storage SELECT policy is owner-only; a user-scoped download would deny
  // authorized non-owners (free readers, entitled buyers, staff). A missing
  // object still surfaces here as downloadError -> 404 below, so this does
  // not mask missing-object issues.
  const admin = createAdminClient();
  const { data: blob, error: downloadError } = await admin.storage
    .from("course-files")
    .download(row.file_path);

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
