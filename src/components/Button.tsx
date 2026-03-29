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
    "inline-flex min-h-[44px] items-center justify-center rounded-md px-6 text-[0.8125rem] font-medium tracking-[0.02em] transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]/40 motion-safe:hover:-translate-y-px";
  const styles =
    variant === "primary"
      ? "border border-[var(--color-border-strong)] bg-[var(--color-ink)] text-[var(--color-surface)] shadow-sm hover:bg-[var(--color-ink-soft)] hover:shadow-md"
      : "text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] motion-safe:hover:translate-y-0";

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
