import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { navItems, site } from "@/data";

const ROLE = "Engineer & Writer";

/** Brand icons, 24px grid, drawn in currentColor. */
const SOCIAL_ICONS = [
  {
    label: "GitHub",
    href: site.social.github,
    path: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
  },
  {
    label: "LinkedIn",
    href: site.social.linkedin,
    path: "M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.97 1.97 0 1 0 0 3.94 1.97 1.97 0 0 0 0-3.94ZM20.44 13.4c0-3.1-1.66-4.54-3.87-4.54a3.35 3.35 0 0 0-3.03 1.67V8.5h-3.37V20h3.37v-5.7c0-1.5.29-2.95 2.14-2.95 1.83 0 1.85 1.71 1.85 3.05V20h3.38l-.47-6.6Z",
  },
  {
    label: "Medium",
    href: site.social.medium,
    path: "M13.54 12a6.27 6.27 0 1 1-12.54 0 6.27 6.27 0 0 1 12.54 0Zm6.88 0c0 3.24-1.4 5.87-3.13 5.87S14.15 15.24 14.15 12s1.4-5.87 3.14-5.87 3.13 2.63 3.13 5.87ZM23 12c0 2.9-.49 5.26-1.1 5.26-.6 0-1.1-2.36-1.1-5.26s.5-5.26 1.1-5.26c.61 0 1.1 2.36 1.1 5.26Z",
  },
] as const;

function linkClass(isActive: boolean) {
  return [
    "nav-item py-2 text-[0.8125rem] tracking-[0.03em]",
    isActive ? "nav-item--active" : "nav-item--idle font-normal",
  ].join(" ");
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // On the home page the bar shares the hero's gutter, so the mark and the headline align.
  const isHome = pathname === "/";

  return (
    <header className={`site-header pointer-events-none${isHome ? " site-header--home" : ""}`}>
      <div
        className={`site-header__bar pointer-events-auto mx-auto flex items-center md:grid justify-between gap-4 py-4 ${
          isHome ? "site-header__bar--hero" : "max-w-6xl px-4 sm:px-6 lg:px-10"
        }`}
      >
        <NavLink
          to="/"
          className="site-brand rounded focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label={`${site.name}, home`}
          onClick={() => setOpen(false)}
        >
          <span className="site-brand__mark" aria-hidden="true">
            AB<span className="site-brand__dot">.</span>
          </span>
          <span className="site-brand__text" aria-hidden="true">
            <span className="site-brand__name">{site.name}</span>
            <span className="site-brand__role">{ROLE}</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex lg:gap-0.5" aria-label="Primary">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${linkClass(isActive)} px-2.5 lg:px-3 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded`
              }
              end={to === "/"}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__tools hidden items-center gap-1 md:flex">
          <ul className="site-socials hidden items-center xl:flex" aria-label="Profiles">
            {SOCIAL_ICONS.map(({ label, href, path }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-social rounded focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  aria-label={`${label} (opens in a new tab)`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={path} fill="currentColor" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <NavLink
            to="/about#contact"
            className="site-header__cta hidden lg:inline-flex focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Get in touch <span aria-hidden="true">↗</span>
          </NavLink>
          <ThemeToggle className="ml-1" />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-ink)] hover:bg-[var(--color-surface-mid)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="site-header__panel pointer-events-auto border-t border-[var(--color-border)] px-4 py-2 md:hidden"
        >
          <div className="flex flex-col">
            {navItems.map(({ to, label }) => {
              const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`min-h-[48px] py-3 ${linkClass(isActive)}`}
                  onClick={() => setOpen(false)}
                  end={to === "/"}
                >
                  {label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
