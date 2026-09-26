import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateBearer } from "@/lib/supabase/bearer";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Serve an uploaded course file or thumbnail through the Azenion origin so
 * that response headers are controlled by this application rather than by
 * the storage bucket defaults.
 *
 * Access model (publish-state based): courses are catalog content and
 * published course files/thumbnails are readable by every visitor,
 * authenticated or anonymous, through this route. Draft or archived courses
 * additionally require the caller to be the course owner or course staff —
 * enforced here, BEFORE the storage read.
 *
 * Security posture:
 *   - Authorization runs first on the user-scoped Supabase client so the
 *     database RLS policies are the authorization layer (course lookup,
 *     is_course_manager check). Only AFTER an allow-decision is the object
 *     byte-fetch performed with the server-side service-role client,
 *     because the private `course-files` bucket intentionally carries an
 *     owner-only storage SELECT policy and a user-scoped download would
 *     wrongly 404 for authorized non-owners. The service-role client never
 *     leaves the server and is never consulted for the access decision
 *     itself.
 *   - The object path is read from the `courses` row for the requested id
 *     and validated against a strict pattern. Client-supplied file paths
 *     are never trusted.
 *   - PDFs, images, and HTML documents are served inline in a new tab. HTML
 *     is sandboxed with scripts/forms/embedding disabled and an opaque origin;
 *     other uploaded assets (CSS/JS/ZIP/etc.) still download with an opaque
 *     Content-Type.
 */

const PDF_CONTENT_TYPE = "application/pdf";
const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const DOWNLOAD_CONTENT_TYPE = "application/octet-stream";
const HTML_CSP =
  "sandbox; default-src 'none'; img-src data: https:; media-src data: https:; " +
  "style-src 'unsafe-inline' https:; font-src data: https:; script-src 'none'; " +
  "object-src 'none'; form-action 'none'; base-uri 'none'";
const HTML_PREVIEW_CSP =
  "sandbox allow-scripts; default-src 'none'; img-src data: https:; media-src data: https:; " +
  "style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline' https:; " +
  "connect-src https:; object-src 'none'; form-action 'none'; base-uri 'none'";

const THUMBNAIL_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const MAX_OBJECT_PATH_LENGTH = 500;

function fileExtension(filePath: string): string {
  return filePath.split(".").pop()?.toLowerCase() ?? "";
}

function isSafeObjectPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= MAX_OBJECT_PATH_LENGTH &&
    /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/i.test(path)
  );
}

function isSafeThumbnailPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= MAX_OBJECT_PATH_LENGTH &&
    /^courses\/[0-9a-f-]{36}\/thumbnail\.(jpg|jpeg|png|webp|avif)$/i.test(
      path,
    )
  );
}

function isCourseManagerResult(value: unknown): boolean {
  return value === true;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const view = request.nextUrl.searchParams.get("view");
  const wantsThumbnail = view === "thumbnail";
  const wantsPreview = view === "preview";

  // Resolve the request's auth principal. Web callers authenticate via
  // cookies; native callers present `Authorization: Bearer <access_token>`.
  // Published course content is public through this route by design (see
  // above). Draft/archived courses additionally require owner or staff —
  // checked below before the storage read, using the same canonical rules
  // for both credential types.
  const supabase = await createClient();

  // Rate limit: 60 req/min for authenticated users, 20 req/min for anonymous
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  let rateKey: string;
  let rateLimit: number;
  if (cookieUser) {
    rateKey = `user:${cookieUser.id}`;
    rateLimit = 60;
  } else {
    rateKey = `ip:${clientIp(request)}`;
    rateLimit = 20;
  }
  const rl = await checkRateLimit("course_file_download", rateKey, rateLimit, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limited — please try again shortly." },
      { status: 429 },
    );
  }

  let user = cookieUser;
  let scoped = supabase;
  if (!user && request.headers.get("authorization")) {
    const bearer = await authenticateBearer(request);
    if (bearer.ok) {
      user = bearer.principal.user;
      scoped = bearer.principal.supabase;
    }
  }

  const { data: course, error } = await scoped
    .from("courses")
    .select("content_type, file_path, thumbnail, status, created_by, publisher_type, publisher_team_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const row = course as unknown as {
    content_type: string;
    file_path: string | null;
    thumbnail: string | null;
    status: string | null;
    created_by: string | null;
    publisher_type: string | null;
    publisher_team_id: string | null;
  };

  const isOwner = user != null && row.created_by != null && row.created_by === user.id;
  // Independent auth checks — run together (second gated only on
  // publisher_team_id, not on the first result).
  const [managesRes, canPublishRes] = await Promise.all([
    user && !isOwner ? scoped.rpc("is_course_manager") : Promise.resolve({ data: null }),
    user && row.publisher_team_id
      ? scoped.rpc("can_publish_course_for_team", {
          p_team_id: row.publisher_team_id,
        })
      : Promise.resolve({ data: null }),
  ]);
  const isStaff = isCourseManagerResult(managesRes.data);
  let isTeamPublisher = false;
  if (user && row.publisher_team_id) {
    isTeamPublisher = canPublishRes.data === true;
  }
  const isPrivileged = isOwner || isStaff || isTeamPublisher;
  if (!isPrivileged && row.status !== "published") {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Thumbnails are stored as public-URL strings in the thumbnail column;
  // derive the object key and serve the bytes through this route so the
  // private bucket posture is preserved.
  let objectPath: string | null = null;
  if (wantsThumbnail) {
    if (!row.thumbnail) {
      return NextResponse.json({ error: "File unavailable" }, { status: 404 });
    }
    const marker = "/course-files/";
    const idx = row.thumbnail.indexOf(marker);
    objectPath = idx >= 0 ? row.thumbnail.slice(idx + marker.length) : null;
    if (!objectPath || !isSafeThumbnailPath(objectPath)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }
  } else {
    objectPath = row.file_path;
    if (!objectPath) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (!isSafeObjectPath(objectPath)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }
  }

  const ext = fileExtension(objectPath);

  // Delivery: authorization above already returned allow. Fetch the bytes
  // with the server-side service-role client because the private bucket's
  // storage SELECT policy is owner-only; a user-scoped download would deny
  // authorized non-owners. A missing object still surfaces here as
  // downloadError -> 404 below, so this does not mask missing-object
  // issues.
  const admin = createAdminClient();
  const { data: blob, error: downloadError } = await admin.storage
    .from("course-files")
    .download(objectPath);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Security-Policy": "sandbox",
    // The preview is an iframe on the same origin; override the app-wide DENY.
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=3600",
  };

  if (wantsThumbnail) {
    headers["Content-Type"] =
      THUMBNAIL_CONTENT_TYPES[ext] ?? DOWNLOAD_CONTENT_TYPE;
    headers["Content-Disposition"] = `inline; filename="course-${id}-thumbnail.${ext}"`;
    return new NextResponse(blob, { status: 200, headers });
  }

  const isPdf = row.content_type === "pdf" && ext === "pdf";
  const isHtml = ext === "html" || ext === "htm";
  if (isPdf) {
    headers["Content-Type"] = PDF_CONTENT_TYPE;
    headers["Content-Disposition"] = `inline; filename="course-${id}.pdf"`;
  } else if (isHtml) {
    headers["Content-Type"] = HTML_CONTENT_TYPE;
    headers["Content-Disposition"] = `inline; filename="course-${id}.${ext}"`;
    headers["Content-Security-Policy"] = wantsPreview ? HTML_PREVIEW_CSP : HTML_CSP;
  } else {
    headers["Content-Type"] = DOWNLOAD_CONTENT_TYPE;
    headers["Content-Disposition"] = `attachment; filename="course-${id}.${ext}"`;
  }

  return new NextResponse(blob, {
    status: 200,
    headers,
  });
}
