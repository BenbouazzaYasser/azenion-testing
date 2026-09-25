"use client";

import { Moon, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

export function LightModeButton() {
  const { setTheme, effective } = useTheme();
  const isLight = effective === "light";
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-10 w-10 px-0"
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      <SunMedium size={20} className={isLight ? "hidden" : "block"} />
      <Moon size={20} className={isLight ? "block" : "hidden"} />
    </Button>
  );
}