import { Link } from "react-router-dom";
import { links, site, socialNav } from "@/data";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-ink)]">
              {site.name}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {site.footerTagline}
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between lg:justify-end lg:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="section-label">On this site</p>
              <Link
                to="/projects"
                className="link-editorial link-editorial--from-body text-sm font-medium"
              >
                Projects
              </Link>
              <Link
                to="/arsenal/writing"
                className="link-editorial link-editorial--from-body text-sm font-medium"
              >
                Writing & Essays
              </Link>
              <Link
                to="/learning"
                className="link-editorial link-editorial--from-body text-sm font-medium"
              >
                Learning Hub
              </Link>
              <Link
                to="/about#contact"
                className="link-editorial link-editorial--from-body text-sm font-medium"
              >
                Contact
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="section-label">Elsewhere</p>
              {socialNav.map(({ key, label }) => (
                <a
                  key={key}
                  href={links.social[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-editorial link-editorial--from-body text-sm font-medium"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-[0.75rem] text-[var(--color-ink-muted)]">
          © {year} {site.name}
        </p>
      </div>
    </footer>
  );
}
