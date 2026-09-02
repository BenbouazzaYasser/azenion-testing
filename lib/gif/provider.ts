import "server-only";

// GIF provider abstraction — server-side only (API keys never reach client)
// Currently implements Giphy; Tenor can be added behind same interface.

export type GifProviderId = "giphy" | "tenor";

export interface GifResult {
  id: string;
  title: string;
  url: string; // original / downsized URL to render
  previewUrl: string; // smaller preview (fixed_width)
  width?: number;
  height?: number;
  provider: GifProviderId;
}

export interface GifSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

// Approved domains for persisted GIF URLs — prevents arbitrary external URL injection
const ALLOWED_GIPHY_HOSTS = ["giphy.com", "media.giphy.com", "media0.giphy.com", "media1.giphy.com", "media2.giphy.com", "media3.giphy.com", "media4.giphy.com", "i.giphy.com"];
const ALLOWED_TENOR_HOSTS = ["tenor.com", "media.tenor.com"];

export function isAllowedGifUrl(url: string, provider: GifProviderId): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const allowed = provider === "giphy" ? ALLOWED_GIPHY_HOSTS : ALLOWED_TENOR_HOSTS;
    return allowed.some((h) => host === h || host.endsWith(`.${h}`) || host === h.replace("media.", ""));
  } catch {
    return false;
  }
}

function getGiphyKey(): string | null {
  const key = process.env.GIPHY_API_KEY || null;
  return key && key.trim().length > 0 ? key.trim() : null;
}

interface GiphyApiResponse {
  data: Array<{
    id: string;
    title: string;
    images: {
      original: { url: string; width?: string; height?: string };
      fixed_width: { url: string; width?: string; height?: string };
      downsized_medium?: { url: string };
    };
  }>;
  meta: { status: number; msg: string };
}

async function giphySearch({ query, limit = 12, offset = 0 }: GifSearchOptions): Promise<GifResult[]> {
  const key = getGiphyKey();
  if (!key) throw new Error("GIPHY_API_KEY not configured");
  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 25)));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("rating", "pg-13");
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited — please try again shortly");
    throw new Error(`Giphy search failed (${res.status})`);
  }
  const json = (await res.json()) as GiphyApiResponse;
  if (json.meta.status !== 200) throw new Error(json.meta.msg || "Giphy error");

  return json.data.map((g) => ({
    id: g.id,
    title: g.title || query,
    url: g.images.original.url,
    previewUrl: g.images.fixed_width.url || g.images.original.url,
    width: g.images.original.width ? Number(g.images.original.width) : undefined,
    height: g.images.original.height ? Number(g.images.original.height) : undefined,
    provider: "giphy" as const,
  }));
}

async function giphyTrending(limit = 12): Promise<GifResult[]> {
  const key = getGiphyKey();
  if (!key) throw new Error("GIPHY_API_KEY not configured");
  const url = new URL("https://api.giphy.com/v1/gifs/trending");
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", String(Math.min(limit, 25)));
  url.searchParams.set("rating", "pg-13");

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited — please try again shortly");
    throw new Error(`Giphy trending failed (${res.status})`);
  }
  const json = (await res.json()) as GiphyApiResponse;
  if (json.meta.status !== 200) throw new Error(json.meta.msg || "Giphy error");

  return json.data.map((g) => ({
    id: g.id,
    title: g.title || "Trending",
    url: g.images.original.url,
    previewUrl: g.images.fixed_width.url || g.images.original.url,
    width: g.images.original.width ? Number(g.images.original.width) : undefined,
    height: g.images.original.height ? Number(g.images.original.height) : undefined,
    provider: "giphy" as const,
  }));
}

export const gifProvider = {
  get isConfigured(): boolean {
    return !!getGiphyKey();
  },
  get providerId(): GifProviderId {
    return "giphy";
  },
  get requiredEnvVar(): string {
    return "GIPHY_API_KEY";
  },
  search: giphySearch,
  trending: giphyTrending,
  isAllowedUrl: isAllowedGifUrl,
  getKey: getGiphyKey,
};

// For future Tenor support: same interface, switch via env
// export const tenorProvider = { ... }

export function getRequiredGifEnvVar(): string {
  return "GIPHY_API_KEY";
}
