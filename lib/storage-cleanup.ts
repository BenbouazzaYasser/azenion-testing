import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function cleanupOrphanedStorageObjects(
  bucket: string,
  paths: string[],
): Promise<{ success: boolean; removed: string[]; error?: string }> {
  const validPaths = paths.filter((p): p is typeof p & string => Boolean(p && p.trim().length > 0));
  if (validPaths.length === 0) {
    return { success: true, removed: [] };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(bucket).remove(validPaths);
    if (error) {
      console.error(`Storage Cleanup Warning: Failed to remove objects from bucket ${bucket}:`, error.message);
      return { success: false, removed: [], error: error.message };
    }
    const removedPaths = (data ?? []).map((d) => d.name);
    return { success: true, removed: removedPaths };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Storage Cleanup Error: Exception while cleaning objects from bucket ${bucket}:`, msg);
    return { success: false, removed: [], error: msg };
  }
}

/**
 * Safe, idempotent removal of storage objects using a caller-provided client.
 * Accepts either a user-scoped client (for compensation cleanup immediately
 * after a failed DB write) or an admin client. Never throws; returns a
 * structured result so callers can decide how to surface failures.
 */
export async function safeRemoveStorageObjects(
  client: import("@supabase/supabase-js").SupabaseClient<import("@/types/database.types").Database>,
  bucket: string,
  paths: string[],
): Promise<{ success: boolean; removed: string[]; error?: string }> {
  const validPaths = paths.filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0 && !p.includes(".."),
  );
  if (validPaths.length === 0) {
    return { success: true, removed: [] };
  }
  try {
    const { data, error } = await client.storage.from(bucket).remove(validPaths);
    if (error) {
      console.error(`Storage Cleanup Warning: Failed to remove objects from bucket ${bucket}:`, error.message);
      return { success: false, removed: [], error: error.message };
    }
    return { success: true, removed: (data ?? []).map((d) => d.name) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Storage Cleanup Error: Exception while cleaning objects from bucket ${bucket}:`, msg);
    return { success: false, removed: [], error: msg };
  }
}

/**
 * Reconciles potential orphaned files under a folder prefix against the set
 * of paths the database currently references. Objects listed in storage but
 * absent from `activePaths` are removed. Documented utility intended for
 * periodic/batch reconciliation (e.g. a cron or manual admin sweep); the
 * current project has no scheduler, so this is invocation-ready only.
 */
export async function reconcileOrphanedStorage(
  client: import("@supabase/supabase-js").SupabaseClient<import("@/types/database.types").Database>,
  bucket: string,
  folderPrefix: string,
  activePaths: Set<string>,
): Promise<{ removedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let removedCount = 0;
  try {
    const { data: list, error: listError } = await client.storage
      .from(bucket)
      .list(folderPrefix, { limit: 100 });
    if (listError || !list) {
      return { removedCount, errors: [listError?.message ?? "Failed to list bucket"] };
    }
    const pathsToRemove: string[] = [];
    for (const item of list) {
      const fullPath = `${folderPrefix}/${item.name}`;
      if (!activePaths.has(fullPath)) pathsToRemove.push(fullPath);
    }
    if (pathsToRemove.length > 0) {
      const res = await safeRemoveStorageObjects(client, bucket, pathsToRemove);
      if (res.success) removedCount += pathsToRemove.length;
      else if (res.error) errors.push(res.error);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Reconciliation failed");
  }
  return { removedCount, errors };
}
