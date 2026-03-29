import type { ExperienceEntry } from "@/content";

export function ExperienceCard({ entry }: { entry: ExperienceEntry }) {
  return (
    <article className="relative border-b border-[var(--color-border)] pb-12 pt-2 last:border-b-0 last:pb-2">
      <div className="relative pl-8 sm:pl-10">
        <span
          className="absolute left-0 top-2 flex h-2 w-2 rounded-full bg-[var(--color-accent)]/45 ring-4 ring-[var(--color-surface)]"
          aria-hidden
        />

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <div>
            <h3 className="font-display text-[1.2rem] font-semibold tracking-tight text-[var(--color-ink)]">
              {entry.role}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-body)]">{entry.company}</p>
          </div>
          <p className="font-mono text-xs text-[var(--color-ink-muted)] sm:shrink-0 sm:text-right">
            {entry.start} — {entry.end}
            <span className="text-[var(--color-ink-muted)]/80"> · </span>
            {entry.location}
          </p>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[var(--color-body)]">{entry.summary}</p>

        <div className="mt-8 border-t border-[var(--color-border)] pt-6">
          <p className="section-label">Outcomes</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-body)]">
            {entry.achievements.map((a) => (
              <li key={a} className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]/40" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
