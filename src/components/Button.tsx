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
    "inline-flex min-h-[44px] items-center justify-center rounded-sm px-6 text-[0.8125rem] font-medium tracking-[0.03em] transition-colors duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]/50";
  const styles =
    variant === "primary"
      ? "border border-[var(--color-border-strong)] bg-white/[0.035] text-[var(--color-ink-soft)] shadow-[0_1px_0_rgba(196,165,116,0.06)] hover:border-[var(--color-accent)]/25 hover:bg-white/[0.05]"
      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]";

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
