import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import { projectCategories, projects, type ProjectCategory } from "@/data";
import { ARSENAL_HUB_SECTIONS } from "@/data/arsenalTopics";

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectCategory | "labs" | "all">("all");

  const showProjects = filter !== "labs";
  const showLabs = filter === "all" || filter === "labs";

  const filteredProjects = useMemo(() => {
    if (filter === "all" || filter === "labs") return projects;
    return projects.filter((p) => p.category === filter);
  }, [filter]);

  const featured = filteredProjects.filter((p) => p.featured);
  const other = filteredProjects.filter((p) => !p.featured);

  return (
    <>
      <Seo
        title="Projects & Systems Arsenal"
        description="Engineering projects, architecture builds, distributed systems tools, and interactive visual labs by Akshay Borse."
        path="/projects"
      />

      <div className="article-shell max-w-[1440px] py-16 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="Portfolio & Systems Arsenal"
          title="Projects & Systems Arsenal"
          subtitle="Software builds, product systems, interactive labs, and algorithm visualizers."
        />

        {/* Category Filters */}
        <div className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[var(--color-border)] pb-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded ${
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
              className={`px-3 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded ${
                filter === c.id
                  ? "border-b border-[var(--color-accent)]/45 text-[var(--color-ink)]"
                  : "border-b border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter("labs")}
            className={`px-3 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded ${
              filter === "labs"
                ? "border-b border-[var(--color-accent)]/45 text-[var(--color-ink)]"
                : "border-b border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
            }`}
          >
            Visual Labs & Experiments
          </button>
        </div>

        {showProjects ? (
          <>
            <h3 className="section-label mt-14">Featured Projects</h3>
            {featured.length === 0 ? (
              <p className="mt-6 border-t border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-ink-muted)]">
                No projects in this category. Try “All” or another filter.
              </p>
            ) : (
              <div className={`mt-8 ${HUB_CARD_GRID}`}>
                {featured.map((p, index) => (
                  <ProjectCard key={p.id} project={p} index={index} viewStyle="nodes" />
                ))}
              </div>
            )}
          </>
        ) : null}

        {showLabs ? (
          <div id="arsenal" className="mt-20">
            <h3 className="section-label">Systems Arsenal & Interactive Labs</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Interactive WebGL visualizers, neural meshes, roadmaps, and system sandboxes.
            </p>
            <div className={`mt-8 ${HUB_CARD_GRID}`}>
              {ARSENAL_HUB_SECTIONS.map((topic, index) => (
                <LearningInteractiveCard
                  key={topic.id}
                  topic={topic}
                  index={index}
                  viewStyle="nodes"
                />
              ))}
            </div>
          </div>
        ) : null}

        {showProjects && other.length > 0 ? (
          <>
            <h3 className="section-label mt-20">Other Engineering Builds</h3>
            <div className={`mt-8 ${HUB_CARD_GRID}`}>
              {other.map((p, index) => (
                <ProjectCard key={p.id} project={p} index={index} viewStyle="nodes" />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
