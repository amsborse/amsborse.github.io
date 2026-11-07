import { earlierWork } from "@/data";

const GITHUB = "https://github.com/amsborse/";

/** Compact, editorial list of older public repositories. */
export function EarlierWork() {
  return (
    <section aria-labelledby="earlier-work-title" className="mt-24">
      <h3 id="earlier-work-title" className="section-label">
        Earlier work
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-body)]">
        University projects, hackathons and first experiments, 2017–2019. Kept public as a record of
        where the work started.
      </p>
      <ul className="mt-8 border-t border-[var(--color-border)]">
        {earlierWork.map((item) => (
          <li key={item.repo} className="border-b border-[var(--color-border)]">
            <a
              href={`${GITHUB}${item.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline gap-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] sm:gap-8"
            >
              <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-[var(--color-ink-muted)]">
                {item.year}
              </span>
              <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-6">
                <span className="block font-medium text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)] sm:w-64 sm:shrink-0">
                  {item.title}
                </span>
                {item.note ? (
                  <span className="mt-1 block text-sm text-[var(--color-body)] sm:mt-0">
                    {item.note}
                  </span>
                ) : null}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                <span className="hidden sm:inline">{item.language ?? ""}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                >
                  ↗
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
