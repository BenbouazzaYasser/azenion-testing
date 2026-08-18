import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const PRIVATE_MEDIA_BUCKET = "private-media";
export const PRIVATE_MEDIA_PREFIX = "private-media/";

export const SIGNED_URL_TTL_SECONDS = 60;

export interface UploadTarget {
  bucket: string;
  objectPath: string;
}

export function isPrivateMediaMarker(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PRIVATE_MEDIA_PREFIX);
}

/** `"private-media/team/abc/file.png"` -> `"team/abc/file.png"` */
export function objectPathFromMarker(marker: string): string {
  return marker.startsWith(PRIVATE_MEDIA_PREFIX)
    ? marker.slice(PRIVATE_MEDIA_PREFIX.length)
    : marker;
}

export function privateMarkerFor(objectPath: string): string {
  return `${PRIVATE_MEDIA_PREFIX}${objectPath}`;
}

export function privateObjectPath(
  kind: "team" | "project",
  id: string,
  filename: string,
): string {
  return `${kind}/${id}/${filename}`;
}

/**
 * Authorize the viewer before issuing a signed URL for a private-media object.
 *
 * The viewer identity is resolved by the DB from the requesting client's JWT:
 *   - `supabase` provided -> 1-arg RPC (pinned to that client's auth.uid());
 *   - otherwise `viewerId` provided -> 2-arg RPC via the admin client;
 *   - neither -> fail closed (no one to authorize).
 */
async function canViewerReadPrivateMedia(
  objectPath: string,
  supabase?: SupabaseClient<Database>,
  viewerId?: string | null,
): Promise<boolean> {
  if (supabase) {
    const { data } = await supabase.rpc("can_access_private_media", {
      p_path: objectPath,
    });
    return data === true;
  }
  if (viewerId != null) {
    const admin = createAdminClient();
    const { data } = await admin.rpc("can_access_private_media", {
      p_path: objectPath,
      p_user_id: viewerId,
    });
    return data === true;
  }
  return false;
}

/**
 * Resolve a stored media value to something a client may render.
 *
 *   - null/empty           -> null
 *   - https:// public URL  -> returned unchanged
 *   - private-media marker -> a signed URL, if the viewer may read it.
 *
 * Private media now fails closed: without a viewer identity (either a
 * user-scoped `supabase` client or an explicit `viewerId` used with the admin
 * client) the marker resolves to null instead of a signed URL.
 *
 * Resolves arrays element-wise, dropping items that fail to resolve.
 */
export async function resolveMediaValue(
  value: string | null | string[] | undefined,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
  supabase?: SupabaseClient<Database>,
  viewerId?: string | null,
): Promise<string | null | string[] | undefined> {
  if (value == null) return value;
  if (Array.isArray(value)) {
    const resolved = await Promise.all(
      value.map((v) => resolveMediaValue(v, ttlSeconds, supabase, viewerId)),
    );
    return resolved.filter((v): v is string => typeof v === "string");
  }
  if (!isPrivateMediaMarker(value)) return value;
  const objectPath = objectPathFromMarker(value);
  if (!(await canViewerReadPrivateMedia(objectPath, supabase, viewerId))) return null;
  const client = supabase ?? createAdminClient();
  const { data, error } = await client.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(objectPath, ttlSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * True when a team is configured private (media must not be world-readable).
 */
export async function isTeamMediaPrivate(
  client: SupabaseClient<Database>,
  teamId: string,
): Promise<boolean> {
  const { data } = await client.from("teams").select("visibility").eq("id", teamId).maybeSingle();
  return data?.visibility === "private";
}

/**
 * True when a project is media-private. Public-facing projects are `public`
 * or `open`; members-only and invitation-only projects are private.
 */
export async function isProjectMediaPrivate(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<boolean> {
  const { data } = await client
    .from("projects")
    .select("visibility")
    .eq("id", projectId)
    .maybeSingle();
  return data?.visibility === "private" || data?.visibility === "invite_only";
}