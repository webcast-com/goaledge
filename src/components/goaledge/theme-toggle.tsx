"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    // contrast-audit-ignore: the default classes below are only ever rendered on
    // dark surfaces (transparent header over the hero, on-dark mobile drawer);
    // light-mode call sites pass their own `className`.
    <button
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
        className ?? "border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
      }`}
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      suppressHydrationWarning
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}