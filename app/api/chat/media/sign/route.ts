import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateBearer } from "@/lib/supabase/bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { CHAT_MEDIA_BUCKET, CHAT_MEDIA_SIGNED_URL_TTL } from "@/lib/chat-media";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/media/sign — mints a short-lived signed URL for a chat
 * attachment the caller is allowed to access.
 *
 * Uploads/downloads stay storage-mediated under RLS; only URL minting needs
 * the server because createSignedUrl requires service-role. The client
 * supplies only the attachment id — never a storage path, never a user id.
 * Authorization reuses the canonical oracles: attachment-row RLS (member of
 * the conversation) plus can_access_chat_media(path) (the same check as the
 * storage SELECT policy). This is NOT a generic storage signing endpoint.
 */

const PRIVATE_NO_STORE = "private, no-store";

function secureHeaders(): Record<string, string> {
  return {
    "Cache-Control": PRIVATE_NO_STORE,
    "X-Content-Type-Options": "nosniff",
  };
}

const bodySchema = z.object({
  attachmentId: z.string().uuid(),
});

function isSafeStoragePath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > 500) return false;
  if (!path.startsWith("chat/")) return false;
  if (path.includes("..")) return false;
  const segments = path.split("/");
  if (segments.length < 3) return false;
  if (!/^[0-9a-fA-F-]{36}$/.test(segments[1] as string)) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(path)) return false;
  return true;
}

export async function POST(request: Request) {
  const bearer = await authenticateBearer(request);
  if (!bearer.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: secureHeaders() });
  }
  const { user, supabase } = bearer.principal;

  const rl = await checkRateLimit("chat_media_sign", `user:${user.id}`, 120, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limited — please try again shortly." },
      { status: 429, headers: secureHeaders() },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 422, headers: secureHeaders() });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attachment id." }, { status: 422, headers: secureHeaders() });
  }

  // Row read runs under the caller's JWT: attachment RLS only returns rows
  // in conversations the caller belongs to. A null row means missing or
  // forbidden — both surface as 403 to avoid an existence oracle.
  const { data: attachment } = await supabase
    .from("chat_message_attachments")
    .select("storage_path")
    .eq("id", parsed.data.attachmentId)
    .maybeSingle();

  const storagePath = (attachment as { storage_path?: unknown } | null)?.storage_path ?? null;
  if (!isSafeStoragePath(storagePath)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: secureHeaders() });
  }

  // Defense in depth: the same canonical oracle as the storage SELECT policy.
  const { data: allowed } = await supabase.rpc("can_access_chat_media", { p_path: storagePath });
  if (allowed !== true) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: secureHeaders() });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, CHAT_MEDIA_SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to sign media." }, { status: 500, headers: secureHeaders() });
  }

  return NextResponse.json(
    {
      signedUrl: data.signedUrl,
      expiresIn: CHAT_MEDIA_SIGNED_URL_TTL,
    },
    { status: 200, headers: secureHeaders() },
  );
}
