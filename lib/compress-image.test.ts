import { describe, expect, it } from "vitest";
import { shouldCompressImage, withImageExtension } from "@/lib/compress-image";

function file(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("shouldCompressImage", () => {
  it("compresses raster images >= 150KB", () => {
    expect(shouldCompressImage(file("a.png", "image/png", 200_000))).toBe(true);
    expect(shouldCompressImage(file("a.jpeg", "image/jpeg", 5_000_000))).toBe(true);
    expect(shouldCompressImage(file("a.webp", "image/webp", 300_000))).toBe(true);
  });

  it("skips small files, SVG, GIF, HEIC and non-images", () => {
    expect(shouldCompressImage(file("a.png", "image/png", 100_000))).toBe(false); // < 150KB
    expect(shouldCompressImage(file("a.svg", "image/svg+xml", 5_000_000))).toBe(false);
    expect(shouldCompressImage(file("a.gif", "image/gif", 5_000_000))).toBe(false); // animated
    expect(shouldCompressImage(file("a.heic", "image/heic", 5_000_000))).toBe(false);
    expect(shouldCompressImage(file("a.pdf", "application/pdf", 5_000_000))).toBe(false);
  });
});

describe("withImageExtension", () => {
  it("rewrites the extension to webp/jpg", () => {
    expect(withImageExtension("photo.PNG", "image/webp")).toBe("photo.webp");
    expect(withImageExtension("IMG_0234.jpeg", "image/webp")).toBe("IMG_0234.webp");
    expect(withImageExtension("noext", "image/jpeg")).toBe("noext.jpg");
  });
});