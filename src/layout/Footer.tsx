import { Link } from "react-router-dom";
import { contentPaths, links, site, socialNav } from "@/content";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-ink)]">{site.name}</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {site.footerTagline}
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between lg:justify-end lg:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="section-label">On this site</p>
              <Link
                to="/contact"
                className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-accent)]"
              >
                Contact
              </Link>
              <Link
                to="/writing"
                className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-accent)]"
              >
                Writing
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="section-label">Elsewhere</p>
              {socialNav.map(({ key, label }) => (
                <a
                  key={key}
                  href={links.social[key]}
                  className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-accent)]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-14 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
          Edit copy in <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.8em]">{contentPaths.config}</code> · Posts in{" "}
          <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.8em]">{contentPaths.posts}</code>
        </p>
        <p className="mt-6 text-[0.75rem] text-[var(--color-ink-muted)]">© {year} {site.name}</p>
      </div>
    </footer>
  );
}
