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
    "inline-flex min-h-[44px] items-center justify-center rounded-sm px-6 text-[0.8125rem] font-medium tracking-[0.03em] transition-[color,background-color,border-color,box-shadow,transform] duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]/50 motion-safe:hover:-translate-y-0.5";
  const styles =
    variant === "primary"
      ? "border border-[var(--color-border-strong)] bg-white/[0.04] text-[var(--color-ink-soft)] shadow-[0_1px_0_rgba(212,184,150,0.08),0_12px_40px_-24px_rgba(0,0,0,0.5)] hover:border-[var(--color-accent)]/35 hover:bg-white/[0.06] hover:shadow-[0_1px_0_rgba(212,184,150,0.12),0_16px_48px_-20px_rgba(72,48,98,0.25)]"
      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)] motion-safe:hover:translate-y-0";

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
