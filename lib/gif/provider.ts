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

// Curated fallback GIFs (public Giphy CDN, no API key required to render) — used when GIPHY_API_KEY is not set so the feature works in local/dev
const MOCK_GIFS: GifResult[] = [
  { id: "mock-hello", title: "Hello", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-laugh", title: "Laugh", url: "https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif", previewUrl: "https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-wow", title: "Wow", url: "https://media.giphy.com/media/3o7ablnW1L2NZXsW9s/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7ablnW1L2NZXsW9s/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-love", title: "Love", url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", previewUrl: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-thumbsup", title: "Thumbs Up", url: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", previewUrl: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-clap", title: "Clap", url: "https://media.giphy.com/media/3o7TKQ8kAP0f9X5PoY/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7TKQ8kAP0f9X5PoY/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-party", title: "Party", url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", previewUrl: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-thinking", title: "Thinking", url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-cool", title: "Cool", url: "https://media.giphy.com/media/26gssIytJvy1b1TH8Q/giphy.gif", previewUrl: "https://media.giphy.com/media/26gssIytJvy1b1TH8Q/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-fire", title: "Fire", url: "https://media.giphy.com/media/3o7TKShaW3RId6qNa8/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7TKShaW3RId6qNa8/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-star", title: "Star", url: "https://media.giphy.com/media/26BRuo6sLetdll9KQ/giphy.gif", previewUrl: "https://media.giphy.com/media/26BRuo6sLetdll9KQ/giphy.gif", width: 480, height: 270, provider: "giphy" },
  { id: "mock-heart", title: "Heart", url: "https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif", previewUrl: "https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif", width: 480, height: 270, provider: "giphy" },
];

function getMockResults(query: string, limit: number): GifResult[] {
  if (!query.trim()) return MOCK_GIFS.slice(0, limit);
  const q = query.toLowerCase();
  const filtered = MOCK_GIFS.filter((g) => g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
  return (filtered.length > 0 ? filtered : MOCK_GIFS).slice(0, limit);
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
  if (!key) return getMockResults(query, limit);
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
  if (!key) return MOCK_GIFS.slice(0, limit);
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
    return true; // Mock GIFs ensure feature works without GIPHY_API_KEY; key unlocks full Giphy search
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
