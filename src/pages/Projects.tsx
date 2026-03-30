import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import {
  projectCategories,
  projects,
  type ProjectCategory,
} from "@/data";

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectCategory | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => p.category === filter);
  }, [filter]);

  const featured = filtered.filter((p) => p.featured);
  const other = filtered.filter((p) => !p.featured);

  return (
    <>
      <Seo
        title="Projects"
        description="Selected engineering work: systems, products, and experiments by Akshay Borse."
        path="/projects"
      />

      <div className="article-shell max-w-6xl py-16 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="Portfolio"
          title="Projects"
          subtitle="Problem, stack, and outcome—structured for scanning without noise."
        />

        <div className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
              filter === "all"
                ? "border-b border-[var(--color-accent)]/45 text-[var(--color-ink)]"
                : "border-b border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
            }`}
          >
            All
          </button>
          {projectCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`px-3 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
                filter === c.id
                  ? "border-b border-[var(--color-accent)]/45 text-[var(--color-ink)]"
                  : "border-b border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <h3 className="section-label mt-14">Featured</h3>
        {featured.length === 0 ? (
          <p className="mt-6 border-t border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-ink-muted)]">
            No projects in this category. Try “All” or another filter.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-16 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-20">
            {featured.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}

        {other.length > 0 ? (
          <>
            <h3 className="section-label mt-20">Other</h3>
            <div className="mt-8 flex flex-col gap-16 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-20">
              {other.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
