import "server-only";
import { cache } from "react";
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

/** Object paths must stay inside the private-media bucket layout (`team/<id>/…` or `project/<id>/…`). */
function isSafePrivateObjectPath(objectPath: string): boolean {
  if (objectPath.length === 0 || objectPath.length > 500) return false;
  if (objectPath.includes("..")) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(objectPath)) return false;
  if (!objectPath.startsWith("team/") && !objectPath.startsWith("project/")) return false;
  return true;
}

export function privateObjectPath(
  kind: "team" | "project",
  id: string,
  filename: string,
): string {
  return `${kind}/${id}/${filename}`;
}

/**
 * Default signed-URL client, memoized per request. `resolveMediaValue` is
 * invoked once per media value (often many times per page, e.g. per feed
 * post), and each omission of an explicit client used to spin up its own
 * admin client. Memoizing keeps exactly one per request; callers that
 * already hold a client (session or admin) should still pass it in.
 */
const getDefaultSignedUrlClient = cache(() => createAdminClient());

/**
 * Per-request memo of objectPath -> signed URL. Feed-style pages resolve the
 * same markers repeatedly (hero + card + author avatar); signing each unique
 * object once per request cuts storage round-trips without extending the
 * URL's effective TTL beyond one render.
 */
const getSignedUrlMemo = cache(() => new Map<string, string>());

async function signObjectPath(
  client: SupabaseClient<Database>,
  objectPath: string,
  ttlSeconds: number,
): Promise<string | null> {
  const memo = getSignedUrlMemo();
  const cached = memo.get(objectPath);
  if (cached) return cached;
  const { data, error } = await client.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(objectPath, ttlSeconds);
  if (error || !data) return null;
  memo.set(objectPath, data.signedUrl);
  return data.signedUrl;
}

/**
 * Resolve a stored media value to something a client may render.
 *
 *   - null/empty           -> null
 *   - https:// public URL  -> returned unchanged
 *   - private-media marker -> a signed URL, if the caller may read it.
 *
 * Resolves arrays element-wise, dropping items that fail to resolve.
 */
export async function resolveMediaValue(
  value: string | null | string[] | undefined,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
  supabase?: SupabaseClient<Database>,
): Promise<string | null | string[] | undefined> {
  if (value == null) return value;
  if (Array.isArray(value)) {
    // Batch every private marker in the array into a single signed-URL
    // request instead of one storage round-trip per element.
    const paths = value.map((v) =>
      isPrivateMediaMarker(v) && isSafePrivateObjectPath(objectPathFromMarker(v))
        ? objectPathFromMarker(v)
        : null,
    );
    const privateIndices = paths
      .map((p, i) => (p !== null ? i : -1))
      .filter((i) => i >= 0);
    const client = supabase ?? getDefaultSignedUrlClient();

    const signed = new Map<number, string>();
    const missing: string[] = [];
    const memo = getSignedUrlMemo();
    for (const i of privateIndices) {
      const cached = memo.get(paths[i]!);
      if (cached) signed.set(i, cached);
      else if (!missing.includes(paths[i]!)) missing.push(paths[i]!);
    }

    if (missing.length > 0) {
      const { data, error } = await client.storage
        .from(PRIVATE_MEDIA_BUCKET)
        .createSignedUrls(missing, ttlSeconds);
      if (!error && data) {
        for (const entry of data) {
          if (entry.error || !entry.signedUrl || !entry.path) continue;
          memo.set(entry.path, entry.signedUrl);
        }
      }
    }

    const resolved = value.map((v, i) => {
      if (paths[i] === null) return v;
      const url = signed.get(i) ?? memo.get(paths[i]!);
      return typeof url === "string" ? url : null;
    });
    return resolved.filter((v): v is string => typeof v === "string");
  }
  if (!isPrivateMediaMarker(value)) return value;
  const client = supabase ?? getDefaultSignedUrlClient();
  const objectPath = objectPathFromMarker(value);
  // Never sign paths outside the expected layout, even if a crafted DB value
  // reaches this helper — fail closed to null.
  if (!isSafePrivateObjectPath(objectPath)) return null;
  return signObjectPath(client, objectPath, ttlSeconds);
}

/**
 * True when a team is configured private (media must not be world-readable).
 * Memoized per request — media-heavy pages check the same team repeatedly.
 */
export const isTeamMediaPrivate = cache(
  async (client: SupabaseClient<Database>, teamId: string): Promise<boolean> => {
    const { data } = await client.from("teams").select("visibility").eq("id", teamId).maybeSingle();
    return data?.visibility === "private";
  },
);

/**
 * True when a project is media-private. Public-facing projects are `public`
 * or `open`; members-only and invitation-only projects are private.
 * Memoized per request — media-heavy pages check the same project repeatedly.
 */
export const isProjectMediaPrivate = cache(
  async (client: SupabaseClient<Database>, projectId: string): Promise<boolean> => {
    const { data } = await client
      .from("projects")
      .select("visibility")
      .eq("id", projectId)
      .maybeSingle();
    return data?.visibility === "private" || data?.visibility === "invite_only";
  },
);