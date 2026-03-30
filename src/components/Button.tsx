import { Link } from "react-router-dom";

type ButtonProps = {
  children: React.ReactNode;
  to?: string;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
};

export function Button({
  children,
  to,
  href,
  variant = "primary",
  className = "",
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center rounded-md px-6 text-[0.8125rem] font-medium tracking-[0.02em] transition-[color,background-color,border-color,box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out-luxe)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]/40 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0";
  const styles =
    variant === "primary"
      ? "border border-[color-mix(in_srgb,var(--color-gold)_32%,var(--color-accent)_18%)] bg-[var(--color-accent)] text-[var(--color-surface-elevated)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_12%,transparent),0_2px_8px_-2px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] hover:border-[color-mix(in_srgb,var(--color-gold)_42%,var(--color-accent)_18%)] hover:bg-[var(--color-accent-bright)] hover:shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_14%,transparent),0_8px_28px_-6px_color-mix(in_srgb,var(--color-accent)_40%,transparent)]"
      : "border border-transparent bg-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] hover:text-[var(--color-accent)] motion-safe:hover:translate-y-0";

  if (to) {
    return (
      <Link to={to} className={`${base} ${styles} ${className}`}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
