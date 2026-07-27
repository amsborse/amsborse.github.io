export type SiteTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "portfolio-theme";

export function resolveInitialTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applySiteTheme(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "light" ? "#f6f4ef" : "#07080d");
  }
}

export function cardColorScheme(theme: SiteTheme): "light" | "dark" {
  return theme === "light" ? "light" : "dark";
}
