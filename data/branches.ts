/**
 * data/branches.ts
 *
 * Types and mapping helpers for the /branches page. Branch content lives in
 * the database; these helpers shape a row from `public.branches` into the
 * `Branch` view model consumed by the showcase components. No hardcoded
 * branches live here anymore.
 */

export type BranchStatus = "active" | "coming-soon";

export interface BranchEvent {
  /** Stable id, unique within a branch's `upcomingEvents` list. */
  id: string;
  title: string;
  /** ISO 8601 date string, e.g. "2026-09-12". */
  date: string;
  location: string;
  description?: string;
}

export interface BranchHighlight {
  /** Stable id, unique within a branch's `highlights` list. */
  id: string;
  /** Short label, e.g. "Weekly Build Nights". */
  label: string;
  description: string;
}

export interface BranchJoinCta {
  label: string;
  href: string;
  helperText?: string;
}

export interface Branch {
  /** URL-safe unique identifier. */
  slug: string;
  /** Full institution name. */
  name: string;
  /** Short display name / acronym. */
  shortName: string;
  city: string;
  country: string;
  tagline: string;
  description: string;
  /**
   * Placeholder member count — updated from live membership data.
   */
  memberCount: number;
  /** Year the branch was founded, e.g. "2024". Optional. */
  founded?: string;
  status: BranchStatus;
  highlights: BranchHighlight[];
  upcomingEvents: BranchEvent[];
  joinCta: BranchJoinCta;
  /**
   * Short glyph rendered in the branch's identity mark (defaults to the
   * first two characters of `shortName` if omitted).
   */
  accentGlyph?: string;
  /** Branch logo URL from the database (falls back to the default mark). */
  logo_url?: string | null;
}

/** Shape of a row from the `public.branches` table. */
export interface BranchRow {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  created_at: string | null;
}

/**
 * Shape a database row into the `Branch` view model. Fields the table does
 * not store fall back to neutral defaults so the showcase renders cleanly.
 */
export function mapBranchRow(row: BranchRow): Branch {
  const name = row.full_name ?? row.name;
  return {
    slug: row.slug,
    name,
    shortName: row.name,
    city: row.city ?? "",
    country: "",
    tagline: row.description ?? "",
    description: row.description ?? "",
    memberCount: 0,
    founded: row.created_at ? String(new Date(row.created_at).getUTCFullYear()) : undefined,
    status: "active",
    logo_url: row.logo_url,
    highlights: [],
    upcomingEvents: [],
    joinCta: {
      label: "Join Branch",
      href: "/branches",
      helperText: `Become a member of ${name}`,
    },
  };
}
