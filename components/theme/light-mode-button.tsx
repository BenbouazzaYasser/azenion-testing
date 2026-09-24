"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

export function LightModeButton() {
  const { setTheme, effective } = useTheme();
  const isLight = effective === "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-transparent text-ink-300 transition-[color,background-color,border-color,box-shadow] duration-200 ease-premium hover:border-border hover:bg-surface-hover hover:text-accent-300 hover:shadow-control active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
    >
      <SunMedium size={20} className={isLight ? "hidden" : "block"} />
      <Moon size={20} className={isLight ? "block" : "hidden"} />
    </button>
  );
}