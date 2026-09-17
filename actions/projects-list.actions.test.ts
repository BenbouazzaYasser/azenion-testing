import { describe, expect, it } from "vitest";
import {
  decodeProjectsCursor,
  encodeProjectsCursor,
} from "@/lib/projects-pagination";

describe("projects keyset cursor", () => {
  it("round-trips created_at + id", () => {
    const cursor = {
      createdAt: "2026-09-01T12:00:00.000Z",
      id: "69eda2de-98c7-4130-8bf2-ef1e8c270af0",
    };
    const encoded = encodeProjectsCursor(cursor);
    expect(typeof encoded).toBe("string");
    // Opaque: must not leak raw values.
    expect(encoded).not.toContain(cursor.id);
    expect(decodeProjectsCursor(encoded)).toEqual(cursor);
  });

  it("returns null for null/undefined/empty cursor (first page)", () => {
    expect(decodeProjectsCursor(null)).toBeNull();
    expect(decodeProjectsCursor(undefined)).toBeNull();
    expect(decodeProjectsCursor("")).toBeNull();
  });

  it("rejects malformed cursors without throwing", () => {
    expect(decodeProjectsCursor("not-base64!!!")).toBeNull();
    expect(decodeProjectsCursor("aGVsbG8=")).toBeNull(); // valid b64, not cursor JSON
    // Valid shape but bad uuid.
    const badId = Buffer.from(
      JSON.stringify({ c: "2026-09-01T12:00:00.000Z", i: "nope" }),
      "utf8",
    ).toString("base64url");
    expect(decodeProjectsCursor(badId)).toBeNull();
    // Valid uuid but unparsable date.
    const badDate = Buffer.from(
      JSON.stringify({ c: "yesterday-ish", i: "69eda2de-98c7-4130-8bf2-ef1e8c270af0" }),
      "utf8",
    ).toString("base64url");
    expect(decodeProjectsCursor(badDate)).toBeNull();
  });
});
