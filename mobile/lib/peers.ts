import { supabase } from "./supabase";

export interface PublicPeer {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

let cache: Map<string, PublicPeer> | null = null;

/**
 * Best-effort id → public profile resolution for chat peers.
 *
 * Direct profiles SELECT only returns the caller's own row (RLS), so names
 * come from the canonical search_users RPC (block-aware, honors
 * search_visibility). Results are cached per app session. Peers outside the
 * window fall back to a short-id label in the UI — no backend change, no
 * privileged access.
 */
export async function resolvePeers(ids: string[]): Promise<Map<string, PublicPeer>> {
  if (!cache) {
    cache = new Map();
    try {
      const { data } = await supabase.rpc("search_users", { p_query: "" });
      for (const row of (data ?? []) as PublicPeer[]) {
        cache.set(row.id, row);
      }
    } catch {
      // Offline or RPC failure: fall back to id labels.
    }
  }
  const out = new Map<string, PublicPeer>();
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit) out.set(id, hit);
  }
  return out;
}

export function clearPeerCache() {
  cache = null;
}
