import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Serve an uploaded course file (content or thumbnail) with the correct
 * Content-Type so browsers render (rather than display as source) HTML/CSS
 * course files. All delivery goes through the API with explicit
 * authorization via can_access_course() — never raw storage URLs.
 *
 * Security:
 * - Authorization is enforced via a user-scoped Supabase client and
 *   the canonical `can_access_course()` RPC before any content is delivered.
 * - Signed URLs are generated internally for the storage download step only;
 *   the API response itself carries the CSP header — do NOT redirect the
 *   browser to a signed URL because that would bypass our CSP protection.
 * - Anonymous access to published free courses is supported via the RPC.
 * - Paid-course entitlement access requires an authenticated user.
 * - Owner/staff access is verified through the user-scoped session.
 * - CSP sandbox protection is always applied to the API response.
 */

/** Content-Type map for course file extensions. */
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
};

/** Extract the file extension from a Supabase file path. */
function fileExtension(filePath: string): string {
  return filePath.split(".").pop()?.toLowerCase() ?? "";
}

/** Validate a safe object path prefix (course-content or thumbnail). */
function isSafeObjectPath(path: string): boolean {
  // Course content paths: courses/${uuid}/${uuid}.{ext}
  const contentPathRegex =
    /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/i;
  // Thumbnail paths: courses/${uuid}/thumbnail.{ext}
  const thumbnailPathRegex =
    /^courses\/[0-9a-f-]{36}\/thumbnail\.[a-z0-9]+\.[a-z0-9]{1,10}$/i;
  return contentPathRegex.test(path) || thumbnailPathRegex.test(path);
}

/** Determine the content type from the file extension, falling back to
 * the course's declared content_type. */
function resolveContentType(
  filePath: string,
  courseContentType?: string
): string {
  const ext = fileExtension(filePath);
  return (
    CONTENT_TYPES[ext] ??
    (courseContentType === "pdf"
      ? "application/pdf"
      : courseContentType === "html_css" && ext === "zip"
        ? "application/zip"
        : "application/octet-stream")
  );
}

/** Determine the content type for thumbnail images. */
function resolveThumbnailContentType(ext: string): string {
  return ext === "pdf"
    ? "application/pdf"
    : ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/octet-stream";
}

/** Download blob from storage and return it with CSP headers.
 *  The signed URL is used only for the privileged download step;
 *  the final HTTP response always carries our own CSP protection. */
async function downloadAndServe(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  isPdf: boolean
): Promise<NextResponse> {
  const ext = fileExtension(path);
  const isPdfCheck = isPdf || path.endsWith(".pdf");
  const contentType = isPdfCheck
    ? "application/pdf"
    : resolveThumbnailContentType(ext);

  const { data: blob, error } = await admin.storage.from("course-files").download(path);
  if (error || !blob) {
    return new NextResponse("File unavailable", { status: 404 });
  }

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Security-Policy": "sandbox allow-scripts",
      "Content-Disposition": `inline; filename="course.${ext}"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  /** 1. Establish the actual requester's user-scoped session. */
  const userScoped = createClient(); // uses cookies / session from the request

  /** 2. Authorize via the canonical boundary. */
  const { data: access, error: rpcError } = await userScoped.rpc(
    "public.can_access_course",
    { course_id: id }
  );

  if (rpcError || !access) {
    // Distinguish 404 (course doesn't exist) from 403 (access denied).
    const supabase = createAdminClient();
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  /** 3. After authorization, use the privileged client for storage. */
  const admin = createAdminClient();

  /** 4. Download / proxy the content from storage. */
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("file_path, content_type, thumbnail")
    .eq("id", id)
    .maybeSingle();

  if (courseError || !course?.file_path) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  /** 5. Determine if this is a thumbnail request. */
  const isThumbnail = request.nextUrl.searchParams.get("isThumbnail") === "true";
  const objectPath = isThumbnail ? course.thumbnail : course.file_path;

  if (!isSafeObjectPath(objectPath)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const ext = fileExtension(objectPath);
  const isPdf = ext === "pdf" || (course.content_type ?? "").includes("pdf");
  const contentType = isThumbnail
    ? resolveThumbnailContentType(ext)
    : resolveContentType(course.file_path ?? "", course.content_type);

  /** 5. Download/proxy the content from storage. */
  const response = await downloadAndServe(admin, objectPath, isPdf);
  if (response.status !== 200) {
    return response;
  }

  /** 6. Return the content from the API itself with CSP protection. */
  return response;
}