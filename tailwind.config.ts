import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "2rem",
        lg: "3rem",
        xl: "4rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Base surfaces — several near-black shades, never flat pure #000
        void: {
          950: "rgb(var(--void-950) / <alpha-value>)",
          900: "rgb(var(--void-900) / <alpha-value>)",
          800: "rgb(var(--void-800) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
        },
        // Brand accent — rgb(40,40,255), used sparingly. Core shades are
        // theme-independent; the tint shades adapt to the current theme.
        accent: {
          DEFAULT: "#2828FF",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "#6D6DFF",
          500: "#2020E8",
          600: "#1818C0",
          glow: "#4747FF",
        },
        ink: {
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / 0.08)",
          strong: "rgb(var(--border-strong) / 0.14)",
        },
        // Glass overlays — dropdowns, drawers, panels, navbar pill (opaque)
        glass: {
          DEFAULT: "rgba(var(--glass) / 1)",
          strong: "rgba(var(--glass-strong) / 1)",
          panel: "rgba(var(--glass-panel) / 1)",
          nav: "rgba(var(--glass-nav) / 1)",
        },
        // Modal backdrop — always dark, matches the brand's night scrim
        scrim: "rgb(var(--scrim) / <alpha-value>)",
        // Signature cosmic surfaces — always dark, theme-independent
        cosmic: "rgb(var(--cosmic))",
        dust: "#FFD9B3",
      },
      fontFamily: {
        display: [
          "Proxima Nova",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(circle at 50% 0%, rgba(40,40,255,0.10), transparent 60%)",
        "grain": "url('/noise.svg')",
      },
      boxShadow: {
        glow: "none",
        "glow-sm": "none",
        card: "0 1px 0 0 rgba(244,245,248,0.06) inset",
        "card-hover": "0 8px 24px -12px rgba(0,0,0,0.4)",
        "card-active": "0 2px 8px -4px rgba(0,0,0,0.45)",
        dialog: "0 30px 80px -20px rgba(0,0,0,0.6)",
        dropdown: "0 24px 70px -20px rgba(0,0,0,0.6)",
        input: "0 0 0 1px rgba(109,109,255,0.15)",
        "input-error": "0 0 0 1px rgba(239,68,68,0.3)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dropdown-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "drift-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.75" },
          "50%": { opacity: "1" },
        },
        "twinkle": {
          "0%, 100%": { opacity: "var(--tw-twinkle-base, 0.4)" },
          "50%": { opacity: "1" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "scroll-dot": {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "translateY(14px)", opacity: "0" },
        },
        // -- Infinity variant keyframes --
        "infinity-about": {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.03)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
        "infinity-about-glow": {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" },
        },
        "infinity-branches": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        "infinity-teams-glow": {
          "0%, 100%": { opacity: "0.55" },
          "25%": { opacity: "0.85" },
          "50%": { opacity: "0.65" },
          "75%": { opacity: "0.9" },
        },
        "infinity-projects-glow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        "infinity-showcase-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        "infinity-announcements": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.02)" },
        },
        "infinity-announcements-glow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.8" },
        },
        "infinity-contact-glow": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.85" },
        },
        "infinity-login-glow": {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "0.5" },
        },
        "infinity-join": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.35" },
          "50%": { transform: "scale(1.015)", opacity: "0.55" },
        },
        "infinity-team-detail": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "infinity-team-detail-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.8" },
        },
        "infinity-project-detail-glow": {
          "0%, 100%": { opacity: "0.4" },
          "40%": { opacity: "0.75" },
          "60%": { opacity: "0.9" },
          "80%": { opacity: "0.65" },
        },
        // -- Background infinity keyframes --
        "bg-infinity-reverse": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        "bg-infinity-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "bg-infinity-pulse": {
          "0%, 100%": { opacity: "0.04" },
          "50%": { opacity: "0.07" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "dropdown-in": "dropdown-in 0.28s cubic-bezier(0.16,1,0.3,1)",
        "drift-slow": "drift-slow 240s linear infinite",
        "pulse-glow": "pulse-glow 7s ease-in-out infinite",
        twinkle: "twinkle 5s ease-in-out infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        "scroll-dot": "scroll-dot 2.2s cubic-bezier(0.4,0,0.2,1) infinite",
        "infinity-about": "infinity-about 300s ease-in-out infinite",
        "infinity-about-glow": "infinity-about-glow 12s ease-in-out infinite",
        "infinity-branches": "infinity-branches 240s linear infinite",
        "infinity-teams-glow": "infinity-teams-glow 10s ease-in-out infinite",
        "infinity-projects-glow": "infinity-projects-glow 5s ease-in-out infinite",
        "infinity-showcase-glow": "infinity-showcase-glow 8s ease-in-out infinite",
        "infinity-announcements": "infinity-announcements 300s ease-in-out infinite",
        "infinity-announcements-glow": "infinity-announcements-glow 14s ease-in-out infinite",
        "infinity-contact-glow": "infinity-contact-glow 10s ease-in-out infinite",
        "infinity-login-glow": "infinity-login-glow 20s ease-in-out infinite",
        "infinity-join": "infinity-join 300s ease-in-out infinite",
        "infinity-team-detail": "infinity-team-detail 240s linear infinite",
        "infinity-team-detail-glow": "infinity-team-detail-glow 8s ease-in-out infinite",
        "infinity-project-detail-glow": "infinity-project-detail-glow 6s ease-in-out infinite",
        "bg-infinity-reverse": "bg-infinity-reverse 240s linear infinite",
        "bg-infinity-scale": "bg-infinity-scale 120s ease-in-out infinite",
        "bg-infinity-pulse": "bg-infinity-pulse 60s ease-in-out infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
