import { useId } from "react";
import { useTheme } from "@/theme/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const maskId = `theme-bite-${useId().replace(/:/g, "")}`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-wash)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <svg className="theme-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <mask id={maskId}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="bite" cx="16.5" cy="7.5" r="5.5" fill="#000" />
        </mask>
        <circle
          className="core"
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
        <g className="rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <path key={angle} d="M12 2.5v2.2" transform={`rotate(${angle} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}
