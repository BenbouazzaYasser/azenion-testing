import { afterEach, describe, expect, it, vi } from "vitest";
import { gifProvider, isAllowedGifUrl } from "@/lib/gif/provider";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("gif provider fallback (GIPHY_API_KEY unset)", () => {
  it("isConfigured is true because mock GIFs keep the feature working", () => {
    expect(gifProvider.isConfigured).toBe(true);
  });

  it("returns curated mock results when no key is configured", async () => {
    vi.stubEnv("GIPHY_API_KEY", "");
    const results = await gifProvider.search({ query: "hello" });
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first?.provider).toBe("giphy");
  });

  it("getKey trims whitespace and returns null when absent", () => {
    vi.stubEnv("GIPHY_API_KEY", "   ");
    expect(gifProvider.getKey()).toBeNull();
    vi.stubEnv("GIPHY_API_KEY", "  abc123  ");
    expect(gifProvider.getKey()).toBe("abc123");
  });

  it("isAllowedUrl validates only approved hosts", () => {
    expect(isAllowedGifUrl("https://media.giphy.com/media/abc/giphy.gif", "giphy")).toBe(true);
    expect(isAllowedGifUrl("https://media.tenor.com/abc/xyz.gif", "tenor")).toBe(true);
    expect(isAllowedGifUrl("https://evil.example.com/giphy.gif", "giphy")).toBe(false);
    expect(isAllowedGifUrl("not-a-url", "giphy")).toBe(false);
  });

  it("requiredEnvVar and getRequiredGifEnvVar advertise the config surface", () => {
    expect(gifProvider.requiredEnvVar).toBe("GIPHY_API_KEY");
    expect(gifProvider.providerId).toBe("giphy");
  });
});