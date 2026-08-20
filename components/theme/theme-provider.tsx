"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

const THEME_COOKIE = "azenion-theme";
const THEME_STORAGE = "azenion-theme";

function getSystemTheme(): Exclude<Theme, "system"> {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  const effective = theme === "system" ? getSystemTheme() : theme;
  root.dataset.theme = effective;
  root.dataset.themePreference = theme;
  root.style.colorScheme = effective;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** The resolved theme (system resolved to light/dark). */
  effective: Exclude<Theme, "system">;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  effective: "dark",
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  initialTheme?: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "dark");

  // The inline <head> script already applied the stored preference to the DOM
  // before React loads. Start from the server default during hydration so the
  // server and client render identical HTML (no React hydration mismatch on the
  // theme toggle), then sync state from the DOM after mount. The actual colors
  // are driven by `data-theme`, so this update is invisible.
  useEffect(() => {
    const pref = document.documentElement.dataset.themePreference;
    if (pref === "light" || pref === "dark" || pref === "system") {
      setThemeState(pref);
    }
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    applyThemeToDom(next);
    try {
      localStorage.setItem(THEME_STORAGE, next);
    } catch {
      /* ignore */
    }
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      applyTheme(next);
      // Persist to the user's settings (best-effort, cross-device).
      void import("@/actions/settings.actions").then(({ updateSettings }) =>
        updateSettings({ theme: next }),
      );
    },
    [applyTheme],
  );

  // Follow OS changes while in "system" mode and on first paint.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (theme === "system") applyThemeToDom("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const effective = theme === "system" ? getSystemTheme() : theme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effective }}>
      {children}
    </ThemeContext.Provider>
  );
}