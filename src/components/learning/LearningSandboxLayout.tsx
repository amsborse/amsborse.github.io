import { Link } from "react-router-dom";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  controls?: ReactNode;
  stats?: ReactNode;
};

export function LearningSandboxLayout({ title, subtitle, children, controls, stats }: Props) {
  return (
    <div className="hub-page overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-purple-500/10 to-transparent blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <Link
          to="/learning/algorithm"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors mb-8"
        >
          ← Algorithm Hub
        </Link>

        <header className="mb-8">
          <p className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-2">
            {subtitle}
          </p>
          <h1 className="theme-heading text-2xl sm:text-3xl font-display font-semibold">{title}</h1>
        </header>

        {controls && (
          <div className="theme-panel premium-panel rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
            {controls}
          </div>
        )}

        <div className="theme-panel-elevated premium-panel rounded-2xl p-6 min-h-[320px]">
          {children}
        </div>

        {stats && <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">{stats}</div>}
      </div>
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="theme-panel rounded-xl px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="theme-heading text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
