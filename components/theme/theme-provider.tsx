"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "pb-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Prefer live DOM (set by blocking layout script) over React state. */
function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // null until mount - avoids light/dark flash vs themeInitScript
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    const initial = readTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    // Always derive from DOM so a click before/during hydration is correct
    const current = readTheme();
    const next: Theme = current === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const ready = theme !== null;
  const resolved: Theme = theme ?? "light";

  return (
    <ThemeContext.Provider
      value={{ theme: resolved, setTheme, toggleTheme, ready }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
