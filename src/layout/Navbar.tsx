import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navItems, site } from "@/content";

function linkClass(isActive: boolean) {
  return [
    "py-2 text-[0.8125rem] tracking-[0.04em] transition-colors duration-500 ease-out",
    isActive
      ? "font-medium text-[var(--color-ink)]"
      : "font-normal text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]",
  ].join(" ");
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/88 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
        <NavLink
          to="/"
          className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-[var(--color-ink)]"
          onClick={() => setOpen(false)}
        >
          {site.name}
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex lg:gap-0.5" aria-label="Primary">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${linkClass(isActive)} px-2.5 lg:px-3`}
              end={to === "/"}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-ink)] md:hidden"
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

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 md:hidden"
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
