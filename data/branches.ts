/**
 * data/branches.ts
 *
 * Content for the /branches page, decoupled from JSX per project convention.
 *
 * Only officially launched branches should have `status: "active"`. When a
 * new campus is ready to go live, add a new `Branch` entry below — no
 * changes to the page, section components, or types are required. The
 * `activeBranches` / `totalMemberCount` / `totalUpcomingEvents` helpers all
 * derive from this array automatically.
 *
 * Do not add unlaunched institutions here, even as `"coming-soon"` entries —
 * the "Coming Soon" section on the page is intentionally generic and does
 * not name specific schools until they're officially confirmed.
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
  /** URL-safe unique identifier, e.g. "emsi". */
  slug: string;
  /** Full institution name. */
  name: string;
  /** Short display name / acronym, e.g. "EMSI". */
  shortName: string;
  city: string;
  country: string;
  tagline: string;
  description: string;
  /**
   * Placeholder member count — update as real membership numbers come in.
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
}

export const branches: Branch[] = [
  {
    slug: "emsi",
    name: "École Marocaine des Sciences de l'Ingénieur",
    shortName: "EMSI",
    city: "Rabat",
    country: "Morocco",
    tagline: "Engineering the next generation of builders",
    description:
      "The EMSI branch brings together engineering students who want to move past theory and start shipping — from firmware to full-stack products. Expect hands-on build nights, cross-year mentorship, and a direct line into the wider Azenion network.",
    memberCount: 1,
    founded: "2024",
    status: "active",
    highlights: [
      {
        id: "emsi-build-nights",
        label: "Weekly Build Nights",
        description: "Open lab sessions for shipping side projects with peer feedback on tap.",
      },
      {
        id: "emsi-hackathon-squad",
        label: "Hackathon Squad",
        description: "A standing team that trains together and travels to regional hackathons.",
      },
      {
        id: "emsi-mentorship",
        label: "Industry Mentorship Circuit",
        description: "Alumni and partner engineers hold monthly office hours for members.",
      },
    ],
    upcomingEvents: [
      {
        id: "emsi-forum",
        title: "Forum des Clubs",
        date: "",
        location: "",
      },
    ],
    joinCta: {
      label: "Join the EMSI branch",
      href: "#",
      helperText: "Open to all EMSI students — no application required.",
    },
    accentGlyph: "EM",
  },
  {
    slug: "fsr",
    name: "Faculté des Sciences de Rabat",
    shortName: "FSR",
    city: "Rabat",
    country: "Morocco",
    tagline: "Where curiosity turns into capability",
    description:
      "The FSR branch is home to students turning scientific curiosity into working software, research tooling, and early-stage projects. It's a space to trade ideas across departments and get support from people who've been exactly where you are.",
    memberCount: 0,
    founded: "2024",
    status: "active",
    highlights: [
      {
        id: "fsr-research-sprints",
        label: "Research-to-Product Sprints",
        description: "Short sprints that turn a research idea into a working prototype.",
      },
      {
        id: "fsr-study-circles",
        label: "Cross-Department Study Circles",
        description: "Small groups mixing math, CS, and physics students on shared problems.",
      },
      {
        id: "fsr-speaker-series",
        label: "Speaker Series",
        description: "Founders and researchers share how they went from campus to career.",
      },
    ],
    upcomingEvents: [
      {
        id: "fsr-integration",
        title: "Integration Day",
        date: "",
        location: "",
      },
    ],
    joinCta: {
      label: "Join the FSR branch",
      href: "#",
      helperText: "Open to all FSR students — no application required.",
    },
    accentGlyph: "FS",
  },
];

/** Branches that are officially live and should be shown on the page. */
export const activeBranches: Branch[] = branches.filter(
  (branch) => branch.status === "active",
);

/** Combined placeholder member count across all active branches. */
export const totalMemberCount: number = activeBranches.reduce(
  (sum, branch) => sum + branch.memberCount,
  0,
);

/** Combined count of upcoming events across all active branches. */
export const totalUpcomingEvents: number = activeBranches.reduce(
  (sum, branch) => sum + branch.upcomingEvents.length,
  0,
);
