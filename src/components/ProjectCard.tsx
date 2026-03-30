import { projectCategories, type Project } from "@/data";

export function ProjectCard({ project }: { project: Project }) {
  const categoryLabel =
    projectCategories.find((c) => c.id === project.category)?.label ?? project.category;

  return (
    <article className="premium-card group relative p-6 sm:p-7">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
          {project.title}
        </h3>
        <span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          {categoryLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-body)]">{project.summary}</p>
      <dl className="mt-8 space-y-5 text-sm">
        <div>
          <dt className="section-label">Problem</dt>
          <dd className="mt-2 leading-relaxed text-[var(--color-body)]">{project.problem}</dd>
        </div>
        <div>
          <dt className="section-label">Stack</dt>
          <dd className="mt-2 font-mono text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            {project.stack.join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="section-label">Impact</dt>
          <dd className="mt-2 leading-relaxed text-[var(--color-body)]">{project.impact}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {project.links.map((l) => (
          <a key={l.label} href={l.href} className="link-editorial text-sm font-medium">
            {l.label}
          </a>
        ))}
      </div>
    </article>
  );
}
