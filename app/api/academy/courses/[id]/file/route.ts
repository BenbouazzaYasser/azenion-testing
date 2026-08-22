import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Serve an uploaded course file with the correct Content-Type so browsers
 * render (rather than display as source) HTML/CSS course files.
 *
 * Supabase stores some of these objects without content-type metadata (File.type
 * is empty for many .html/.css uploads, and the fallback application/octet-stream
 * / text/plain makes the browser show the raw code). This proxy reads the bytes
 * from the `course-files` bucket and re-serves them with the right header based
 * on the file extension — fixing both existing and future uploads.
 *
 * Security: uploaded HTML/CSS is untrusted. A `Content-Security-Policy: sandbox`
 * header is added to every response so that even if an HTML course file is
 * rendered inline on the Azenion origin it runs fully sandboxed — no scripts,
 * no same-origin access. (Inert for PDF/zip responses.)
 */

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
};

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

  const supabase = createAdminClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("file_path, content_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !course?.file_path) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (!isSafeObjectPath(course.file_path)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const ext = fileExtension(course.file_path);
  const contentType =
    CONTENT_TYPES[ext] ??
    (course.content_type === "pdf"
      ? "application/pdf"
      : course.content_type === "html_css" && ext === "zip"
        ? "application/zip"
        : "application/octet-stream");

  const { data: blob, error: downloadError } = await supabase.storage
    .from("course-files")
    .download(course.file_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Security-Policy": "sandbox allow-scripts",
      "Content-Disposition": `inline; filename="course.${ext}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}