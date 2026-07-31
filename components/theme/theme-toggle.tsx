"use client";

import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, ready } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      className={`pb-theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={
        !ready
          ? "Toggle color theme"
          : isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
      }
      title={!ready ? "Theme" : isDark ? "Light mode" : "Dark mode"}
      suppressHydrationWarning
    >
      {!ready ? (
        <span className="h-4 w-4" aria-hidden />
      ) : isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
        </svg>
      )}
    </button>
  );
}
