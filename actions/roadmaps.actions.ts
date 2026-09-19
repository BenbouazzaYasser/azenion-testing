"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MarkRoadmapNodeCompleteResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server-authoritative learner completion (decision #9). Delegates to the
 * `set_roadmap_node_complete` RPC (00139), which pins identity to auth.uid():
 * completion can never be recorded as another user, for an unpublished
 * roadmap, or for content that is currently unavailable. The client only
 * supplies the target node and revalidates the detail page.
 */
export async function markRoadmapNodeComplete(
  nodeId: string,
  slug: string,
  completed: boolean,
): Promise<MarkRoadmapNodeCompleteResult> {
  if (!nodeId || !slug) {
    return { ok: false, error: "Missing roadmap node or slug" };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_roadmap_node_complete", {
    p_node_id: nodeId,
    p_completed: completed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/academy/roadmaps/${slug}`);
  return { ok: true };
}