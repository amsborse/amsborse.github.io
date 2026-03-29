import { Link } from "react-router-dom";
import { contentPaths, links, site, socialNav } from "@/content";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)]/90 bg-gradient-to-b from-[var(--color-surface)] via-[var(--color-surface-mid)]/40 to-[var(--color-surface-mid)]/90">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="font-display text-lg text-[var(--color-ink)]">{site.name}</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {site.footerTagline}
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between lg:justify-end lg:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="section-label">On this site</p>
              <Link
                to="/contact"
                className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-ink-soft)]"
              >
                Contact
              </Link>
              <Link
                to="/writing"
                className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-ink-soft)]"
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
                  className="text-sm text-[var(--color-body)] transition-colors hover:text-[var(--color-ink-soft)]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-14 border-t border-[var(--color-border)] pt-8 text-[0.6875rem] leading-relaxed text-[var(--color-ink-muted)]">
          © {year} {site.name}. Edit copy in{" "}
          <code className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[0.65rem]">{contentPaths.config}</code>{" "}
          and posts in{" "}
          <code className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[0.65rem]">{contentPaths.posts}</code>.
        </p>
      </div>
    </footer>
  );
}
