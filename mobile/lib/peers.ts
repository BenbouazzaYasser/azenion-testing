import { supabase } from "./supabase";

export interface PublicPeer {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

let cache: Map<string, PublicPeer> | null = null;

/**
 * Best-effort id → public profile resolution for chat peers, comment
 * authors, notification actors, and feed authors.
 *
 * Direct profiles SELECT only returns the caller's own row (RLS), and
 * search_users is a capped, block-aware discovery RPC — so neither source
 * alone covers every author:
 *   - the caller (selfId): read directly from profiles (own-row RLS
 *     permits this; no visibility widened for anyone else);
 *   - everyone else: the canonical search_users RPC (respects blocks and
 *     search_visibility), cached per app session.
 *
 * Peers outside the window keep an honest id-based label in the UI — never
 * a fake identity, never a broadened profile read.
 */
export async function resolvePeers(ids: string[], selfId?: string | null): Promise<Map<string, PublicPeer>> {
  if (!cache) cache = new Map();

  const missing = ids.filter((id) => !cache!.has(id));
  if (missing.length > 0) {
    const jobs: Array<Promise<void>> = [];

    if (selfId && missing.includes(selfId)) {
      jobs.push(
        (async () => {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", selfId)
              .maybeSingle();
            if (data) cache!.set(selfId, data as PublicPeer);
          } catch {
            // Own-row read failed: fall through to id label.
          }
        })(),
      );
    }

    const others = missing.filter((id) => id !== selfId);
    if (others.length > 0) {
      jobs.push(
        (async () => {
          try {
            const { data } = await supabase.rpc("search_users", { p_query: "", p_limit: 50 });
            for (const row of (data ?? []) as PublicPeer[]) {
              if (!cache!.has(row.id)) cache!.set(row.id, row);
            }
          } catch {
            // Offline or RPC failure: fall back to id labels.
          }
        })(),
      );
    }

    await Promise.all(jobs);
  }

  const out = new Map<string, PublicPeer>();
  for (const id of ids) {
    const hit = cache!.get(id);
    if (hit) out.set(id, hit);
  }
  return out;
}

export function clearPeerCache() {
  cache = null;
}
