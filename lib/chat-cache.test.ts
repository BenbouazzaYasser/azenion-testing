import { describe, expect, it } from "vitest";
import { mergeMessages } from "./chat-cache";

interface Msg {
  id: string;
  content: string;
  created_at: string | null;
}

const m = (id: string, created_at: string, content = "x"): Msg => ({ id, content, created_at });

describe("mergeMessages", () => {
  it("unions by id, ascending by created_at", () => {
    const a = [m("1", "2026-01-01T00:00:00Z"), m("2", "2026-01-01T00:00:02Z")];
    const b = [m("3", "2026-01-01T00:00:01Z")];
    expect(mergeMessages(a, b).map((x) => x.id)).toEqual(["1", "3", "2"]);
  });

  it("server rows (second arg) win over cached snapshots", () => {
    const a = [m("1", "2026-01-01T00:00:00Z", "stale")];
    const b = [m("1", "2026-01-01T00:00:00Z", "fresh")];
    expect(mergeMessages(a, b)).toEqual([m("1", "2026-01-01T00:00:00Z", "fresh")]);
  });

  it("dedupes when the same id appears in both inputs", () => {
    const a = [m("1", "2026-01-01T00:00:00Z")];
    const b = [m("1", "2026-01-01T00:00:00Z")];
    expect(mergeMessages(a, b).length).toBe(1);
  });

  it("tolerates null created_at without throwing", () => {
    const a: Msg[] = [{ id: "x", content: "", created_at: null }];
    const b: Msg[] = [m("y", "2026-01-01T00:00:00Z")];
    expect(mergeMessages(a, b).length).toBe(2);
  });
});
