import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectCard } from "@/components/ProjectCard";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import { projectCategories, projects, type ProjectCategory } from "@/data";

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

      <div className="article-shell max-w-[1440px] py-16 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="Portfolio"
          title="Projects & Arsenal"
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
          <div className={`mt-8 ${HUB_CARD_GRID}`}>
            {featured.map((p, index) => (
              <ProjectCard key={p.id} project={p} index={index} />
            ))}
          </div>
        )}

        {other.length > 0 ? (
          <>
            <h3 className="section-label mt-20">Other</h3>
            <div className={`mt-8 ${HUB_CARD_GRID}`}>
              {other.map((p, index) => (
                <ProjectCard key={p.id} project={p} index={index} />
              ))}
            </div>
          </>
        ) : null}

        {/* Arsenal Labs & Interactive Systems Callout */}
        <div className="mt-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
                Interactive Labs & Experiments
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
                Explore the Systems Arsenal
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Dive into real-time WebGL simulations, algorithm visualizers, anomaly matrices, and
                live telemetry labs built to test system trade-offs.
              </p>
            </div>
            <Link
              to="/arsenal"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
            >
              Open Arsenal Labs →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
