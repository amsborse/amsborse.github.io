import type { TocItem } from "@/utils/markdown";

type TableOfContentsProps = {
  items: TocItem[];
  /** Minimal = intimate reading layout (default). */
  variant?: "default" | "minimal";
};

export function TableOfContents({ items, variant = "minimal" }: TableOfContentsProps) {
  if (items.length === 0) return null;

  if (variant === "minimal") {
    return (
      <nav className="text-[0.8125rem] leading-relaxed" aria-label="On this page">
        <p className="mb-3 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]/80">
          On this page
        </p>
        <ul className="space-y-2 border-l border-[var(--color-border)]/50 pl-4">
          {items.map((item) => (
            <li
              key={item.id}
              className={
                item.level === 3 ? "ml-0 pl-2 text-[0.78rem] text-[var(--color-ink-muted)]" : ""
              }
            >
              <a
                href={`#${item.id}`}
                className="toc-reading-link text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="border-l border-[var(--color-border-strong)] pl-5" aria-label="Table of contents">
      <p className="section-label mb-4">Contents</p>
      <ul className="space-y-2.5 text-[0.8125rem] leading-snug">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "ml-1 pl-3 text-[0.8rem] text-[var(--color-ink-muted)]/90" : ""}
          >
            <a
              href={`#${item.id}`}
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
