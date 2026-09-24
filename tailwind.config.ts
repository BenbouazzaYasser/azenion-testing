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
        void: {
          950: "rgb(var(--void-950) / <alpha-value>)",
          900: "rgb(var(--void-900) / <alpha-value>)",
          800: "rgb(var(--void-800) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-primary) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          glow: "rgb(var(--accent-400) / <alpha-value>)",
        },
        secondary: {
          300: "rgb(var(--secondary-300) / <alpha-value>)",
          400: "rgb(var(--secondary-400) / <alpha-value>)",
          500: "rgb(var(--secondary-500) / <alpha-value>)",
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
          DEFAULT: "rgb(var(--border) / 0.1)",
          strong: "rgb(var(--border-strong) / 0.18)",
        },
        glass: {
          DEFAULT: "rgb(var(--glass) / 0.96)",
          strong: "rgb(var(--glass-strong) / 0.98)",
          panel: "rgb(var(--glass-panel) / 0.96)",
          nav: "rgb(var(--glass-nav) / 0.96)",
        },
        scrim: "rgb(var(--scrim) / <alpha-value>)",
        cosmic: "rgb(var(--cosmic))",
      },
      spacing: {
        0: "var(--space-0)",
        px: "var(--space-0-5)",
        0.5: "var(--space-0-5)",
        1: "var(--space-1)",
        1.5: "var(--space-1-5)",
        2: "var(--space-2)",
        2.5: "var(--space-2-5)",
        3: "var(--space-3)",
        3.5: "var(--space-3-5)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        11: "var(--space-11)",
        12: "var(--space-12)",
        14: "var(--space-14)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        "4xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-ui)"],
        body: ["var(--font-body)"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(circle at 50% 0%, rgb(var(--accent-primary) / 0.07), transparent 62%)",
        grain: "url('/noise.svg')",
      },
      boxShadow: {
        control: "var(--shadow-control)",
        glow: "var(--shadow-control)",
        "glow-sm": "var(--shadow-control)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "card-active": "var(--shadow-card-active)",
        dialog: "var(--shadow-dialog)",
        dropdown: "var(--shadow-dropdown)",
        input: "0 0 0 1px rgb(var(--border) / 0.1)",
        "input-error": "0 0 0 1px rgb(239 68 68 / 0.3)",
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
        // Interaction/entrance motion stays within the 150–200ms budget.
        // Ambient infinity/background loops below are a deliberate exception:
        // slow, opacity-only decoration with reduced-motion fallback in globals.css.
        "fade-in-up": "fade-in-up var(--duration-slow) var(--ease-standard) forwards",
        "dropdown-in": "dropdown-in var(--duration-base) var(--ease-standard)",
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
      transitionDuration: {
        150: "var(--duration-fast)",
        200: "var(--duration-base)",
        300: "var(--duration-base)",
        500: "var(--duration-slow)",
        700: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        premium: "var(--ease-standard)",
      },
    },
  },
  plugins: [],
};

export default config;
