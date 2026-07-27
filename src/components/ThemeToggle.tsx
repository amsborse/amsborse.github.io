import { useTheme } from "@/theme/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-wash)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {isDark ? (
          <path
            d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M5.6 5.6 4.1 4.1M19.9 19.9l-1.5-1.5M18.4 5.6l1.5-1.5M5.6 18.4l-1.5 1.5M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
