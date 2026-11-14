import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { SITE_DESIGNS } from "@/theme/design";

/** Picks one of the three site designs. The original "Editorial" stays the default. */
export function DesignSwitcher({ className = "" }: { className?: string }) {
  const { design, setDesign } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = SITE_DESIGNS.find((d) => d.id === design) ?? SITE_DESIGNS[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`design-switcher relative ${className}`}>
      <button
        type="button"
        className="design-switcher__button inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-wash)] px-2.5 text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Design: ${current.label}. Change design`}
        title="Change design"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="design-switcher__swatch" data-swatch={current.id} aria-hidden="true" />
        <span className="hidden text-xs font-medium 2xl:inline">{current.label}</span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="design-switcher__menu absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-chrome-bg)] p-1.5 shadow-[var(--shadow-card-hover)]"
        >
          {SITE_DESIGNS.map((d) => (
            <li key={d.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={d.id === design}
                className="design-switcher__item flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-mid)] focus-visible:bg-[var(--color-surface-mid)]"
                onClick={() => {
                  setDesign(d.id);
                  setOpen(false);
                }}
              >
                <span
                  className="design-switcher__swatch mt-0.5"
                  data-swatch={d.id}
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {d.label}
                    {d.id === design ? <span className="sr-only"> (current)</span> : null}
                  </span>
                  <span className="text-xs text-[var(--color-body)]">{d.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
