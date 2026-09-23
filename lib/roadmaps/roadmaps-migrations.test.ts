import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

const readMigration = async (name: string): Promise<string> => {
  const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
  if (!sql.trim()) throw new Error(`Migration ${name} is empty`);
  return sql;
};

describe("roadmap migration progress contract", () => {
  it("has a physical migration file for the read RPCs", async () => {
    const sql = await readMigration("00140_academy_roadmaps_read_rpcs.sql");
    expect(sql).toContain("create or replace function public.list_roadmap_summaries");
    expect(sql).toContain("create or replace function public.get_roadmap_detail");
  });

  it("list_roadmap_summaries yields null progress when a roadmap has zero required nodes", async () => {
    const sql = await readMigration("00140_academy_roadmaps_read_rpcs.sql");
    expect(sql).toContain("when coalesce(s.required_count, 0) = 0 then null");
    expect(sql).not.toContain("when coalesce(s.required_count, 0) = 0 then 0");
  });

  it("keeps fractional progress unchanged when a roadmap has required nodes", async () => {
    const sql = await readMigration("00140_academy_roadmaps_read_rpcs.sql");
    expect(sql).toContain(
      "else round(coalesce(s.required_done, 0)::numeric / s.required_count::numeric, 2)",
    );
  });

  it("get_roadmap_detail yields null progress when a roadmap has zero required nodes", async () => {
    const sql = await readMigration("00140_academy_roadmaps_read_rpcs.sql");
    expect(sql).toMatch(/if v_required_count = 0 then\s+v_progress := null;/);
    expect(sql).not.toMatch(/if v_required_count = 0 then\s+v_progress := 0;/);
  });

  it("keeps required-node progress unchanged in get_roadmap_detail", async () => {
    const sql = await readMigration("00140_academy_roadmaps_read_rpcs.sql");
    // Whitespace-tolerant like the sibling assertions: the contract is the
    // required-only formula, not the migration's indentation.
    expect(sql).toMatch(
      /else\s+v_progress := round\(v_required_done::numeric \/ v_required_count::numeric, 2\);/,
    );
  });
});

describe("roadmap migration is_optional validation", () => {
  it("rejects is_optional values that are not JSON booleans", async () => {
    const sql = await readMigration("00139_academy_roadmaps_rpcs.sql");
    expect(sql).toContain(
      "if v_node->'is_optional' is not null and jsonb_typeof(v_node->'is_optional') <> 'boolean' then",
    );
    expect(sql).toContain("is_optional must be a boolean");
  });

  it("inserts is_optional from the JSON boolean value, not a loose SQL cast", async () => {
    const sql = await readMigration("00139_academy_roadmaps_rpcs.sql");
    expect(sql).toContain("coalesce((v_node->'is_optional')::boolean, false)");
    expect(sql).not.toContain("coalesce(v_node->>'is_optional', 'false')::boolean");
  });
});