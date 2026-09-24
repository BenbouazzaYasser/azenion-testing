/**
 * Client-side per-conversation chat state store (pillar 1: persistent local
 * caching, pillar 5: member-profile cache).
 *
 * Memory-backed by design — the spec allows a memory cache, and IndexedDB
 * would add a dependency for zero in-session benefit: the cache's job is
 * instant 0ms re-renders on conversation switch, not surviving full reloads.
 * Swap the factory body for an IndexedDB adapter only if cross-reload
 * persistence is ever wanted.
 */

/** Snapshot of one conversation's loaded history + paging state. */
export interface ConversationSnapshot<T> {
  messages: T[];
  hasMore: boolean;
}

export interface MemoryCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}

/** Minimal Map-backed cache keyed by conversation id. */
export function createMemoryCache<K, V>(): MemoryCache<K, V> {
  const map = new Map<K, V>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
  };
}

/**
 * Union two message lists by id, ascending by created_at — server rows win
 * over cached snapshots. Both inputs are expected in created_at order;
 * a full sort keeps the merged list stable regardless.
 */
export function mergeMessages<T extends { id: string; created_at: string | null }>(
  a: T[],
  b: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) =>
    (x.created_at ?? "").localeCompare(y.created_at ?? ""),
  );
}

/** Resolve each sender's profile at most once per session (realtime path). */
export interface CachedSenderProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string;
}
const profileCache = createMemoryCache<string, CachedSenderProfile>();
export const getCachedProfile = (id: string): CachedSenderProfile | undefined => profileCache.get(id);
export const setCachedProfile = (profile: CachedSenderProfile): void => {
  profileCache.set(profile.id, profile);
};