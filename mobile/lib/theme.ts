// Mobile is currently dark-only by design (single warm-charcoal theme).
// The web app supports light/dark via CSS tokens; mobile keeps navigation
// and layout unchanged and reuses this one palette. Do not add a second
// mobile theme without a matching design decision.
export const palette = {
  bg: "#211F1C",
  surface: "#2B2824",
  surfaceHover: "#37332E",
  card: "#2E2B27",
  border: "rgba(247,245,242,0.08)",
  borderStrong: "rgba(247,245,242,0.16)",
  ink50: "#F7F5F2",
  ink100: "#EEE9E3",
  ink200: "#D8D0C8",
  ink300: "#B8AEA4",
  ink400: "#AAA198",
  ink500: "#9C948B",
  ink600: "#81786F",
  accent: "#5865F2",
  accent400: "#848DF8",
  accent500: "#4F46E5",
  secondary: "#C96F4A",
  secondarySoft: "rgba(201,111,74,0.14)",
  onAccent: "#FFFFFF",
  onAccentMuted: "rgba(255,255,255,0.9)",
  scrim: "rgba(20,19,17,0.72)",
  shadow: "#0C0B0A",
  danger: "#E15B65",
  success: "#50B58A",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  full: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const type = {
  title: 22,
  subtitle: 17,
  body: 15,
  caption: 13,
  tiny: 11,
} as const;

export const lineHeight = {
  title: 28,
  subtitle: 23,
  body: 23,
  caption: 18,
  tiny: 15,
} as const;

export const motion = {
  fast: 150,
  base: 180,
  slow: 200,
} as const;
